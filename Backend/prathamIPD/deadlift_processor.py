"""
deadlift_processor.py
─────────────────────
Dual-model deadlift analyser.

  • MediaPipe Pose  → hip hinge, spine, knee, lockout, head
  • MediaPipe Hands → grip width vs shoulder width, wrist hyperextension
  • YOLOv8-nano    → barbell detection, bar-path trail, bar-to-shin drift,
                     bar level (symmetry)

Camera orientation: SIDE PROFILE (same as squat / lunge).
"""

import cv2
import time
import math
import numpy as np
from collections import deque

import mediapipe as mp

# ── MediaPipe setup ────────────────────────────────────────────────────────────
mp_pose  = mp.solutions.pose
mp_hands = mp.solutions.hands
mp_draw  = mp.solutions.drawing_utils
mp_draw_styles = mp.solutions.drawing_styles

_pose_instance  = None
_hands_instance = None


def _get_pose():
    global _pose_instance
    if _pose_instance is None:
        _pose_instance = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.55,
            min_tracking_confidence=0.55,
        )
    return _pose_instance


def _get_hands():
    global _hands_instance
    if _hands_instance is None:
        _hands_instance = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.55,
            min_tracking_confidence=0.55,
        )
    return _hands_instance


# ── YOLO setup (lazy so import doesn't crash if ultralytics is missing) ────────
_yolo_model = None
_yolo_available = False


def _get_yolo():
    global _yolo_model, _yolo_available
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO("yolov8n.pt")   # downloads ~6 MB on first use
            _yolo_available = True
            print("[Deadlift] YOLOv8-nano loaded ✓")
        except Exception as e:
            print(f"[Deadlift] YOLO unavailable ({e}), using pose-only mode.")
            _yolo_available = False
    return _yolo_model, _yolo_available


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _angle3(a, b, c):
    """Angle at vertex b between rays ba and bc (degrees)."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))


def _pt(lm, idx, w, h):
    """Convert normalised landmark to pixel tuple."""
    l = lm[idx]
    return int(l.x * w), int(l.y * h)


# ── Processor class ───────────────────────────────────────────────────────────

class ProcessFrameDeadlift:
    """
    process(frame) → (annotated_frame, [feedback_strings])

    Stats exposed:
        .deadlift_count   int
        .improper_count   int
        .stage            str  'setup' | 'pull' | 'lockout' | 'lower'
        .bar_drift_px     float  (horizontal drift of bar from setup position)
        .grip_width_ratio float  (grip width / shoulder width; 1.0 = shoulder-width)
    """

    # Stage thresholds (degrees)
    HIP_HINGE_SETUP   = 50   # hip angle < this → person is bent over (setup / bottom)
    HIP_LOCKOUT       = 160  # hip angle > this → fully extended (lockout)
    KNEE_BENT_SETUP   = 110  # knee angle < this → knees bent (setup)
    SPINE_ROUND_LIMIT = 30   # spine deviation from neutral > this → rounding
    WRIST_HYPER_LIMIT = 200  # wrist angle > this → hyperextension

    BAR_DRIFT_LIMIT   = 0.08 # fraction of frame width allowed before flagging
    GRIP_WIDE_LIMIT   = 2.2  # grip > 2.2× shoulder width → too wide
    GRIP_NARROW_LIMIT = 0.85 # grip < 0.85× shoulder width → too narrow

    INACTIVE_THRESH   = 10.0  # seconds without movement → reset

    def __init__(self, flip_frame: bool = True):
        self.flip_frame = flip_frame

        # Lazy-init models
        self._pose  = None
        self._hands = None
        self._yolo  = None
        self._yolo_ok = False

        # Rep counters
        self.deadlift_count  = 0
        self.improper_count  = 0
        self.stage           = "setup"      # setup → pull → lockout → lower

        # Per-rep error flag
        self._rep_has_error  = False
        self._reached_lockout = False

        # Bar tracking
        self.bar_drift_px       = 0.0
        self._bar_setup_x       = None     # x-centre of bar at setup (normalised)
        self._bar_path: deque   = deque(maxlen=20)  # (cx_norm, cy_norm) last 20

        # Grip
        self.grip_width_ratio  = 1.0

        # Inactivity
        self._last_active       = time.time()

        # Drawing font
        self._font = cv2.FONT_HERSHEY_SIMPLEX

    # ── Internal model accessors ───────────────────────────────────────────
    def _mp_pose(self):
        if self._pose is None:
            self._pose = _get_pose()
        return self._pose

    def _mp_hands(self):
        if self._hands is None:
            self._hands = _get_hands()
        return self._hands

    def _yolo_model(self):
        if self._yolo is None:
            self._yolo, self._yolo_ok = _get_yolo()
        return self._yolo, self._yolo_ok

    # ── Public entry point ────────────────────────────────────────────────
    def process(self, frame: np.ndarray):
        if self.flip_frame:
            frame = cv2.flip(frame, 1)

        h, w = frame.shape[:2]
        feedback: list[str] = []

        # ── 1. MediaPipe Pose ────────────────────────────────────────────
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        pose_res  = self._mp_pose().process(rgb)

        # ── 2. MediaPipe Hands ───────────────────────────────────────────
        hands_res = self._mp_hands().process(rgb)
        rgb.flags.writeable = True

        out = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

        # ── 3. YOLO barbell detection ────────────────────────────────────
        bar_box = self._detect_bar(out, h, w)   # returns (cx_norm, cy_norm, x1, y1, x2, y2) or None

        # ── 4. Analyse pose ──────────────────────────────────────────────
        hip_angle  = None
        knee_angle = None
        spine_ok   = True
        pose_valid = False

        if pose_res.pose_landmarks:
            lm = pose_res.pose_landmarks.landmark
            pose_valid, hip_angle, knee_angle, spine_ok, feedback = \
                self._analyse_pose(lm, w, h, out, feedback)

        # ── 5. Analyse hands / grip ──────────────────────────────────────
        if hands_res.multi_hand_landmarks:
            feedback = self._analyse_grip(
                hands_res, pose_res, w, h, out, feedback)

        # ── 6. Update bar path + drift ───────────────────────────────────
        if bar_box is not None:
            cx_n, cy_n, bx1, by1, bx2, by2 = bar_box
            self._bar_path.append((cx_n, cy_n))

            # Draw YOLO box (yellow)
            cv2.rectangle(out, (bx1, by1), (bx2, by2), (0, 220, 220), 2)
            cv2.putText(out, "BAR", (bx1, by1 - 6),
                        self._font, 0.5, (0, 220, 220), 2)

            # On first setup detection, record reference x
            if self.stage == "setup" and self._bar_setup_x is None and pose_valid:
                self._bar_setup_x = cx_n

            # Compute horizontal drift from setup position
            if self._bar_setup_x is not None:
                drift = abs(cx_n - self._bar_setup_x)
                self.bar_drift_px = drift * w
                if drift > self.BAR_DRIFT_LIMIT and self.stage == "pull":
                    feedback.append("BAR DRIFTING AWAY FROM BODY — KEEP IT CLOSE")
                    self._rep_has_error = True

            # Bar level check: compare y coords of left vs right edge
            bar_tilt = abs(by1 - by2)
            if bar_tilt > 15:
                feedback.append("BAR NOT LEVEL — CHECK GRIP SYMMETRY")
                self._rep_has_error = True

        # Draw bar path trail
        self._draw_bar_trail(out, w, h)

        # ── 7. State machine & rep counting ─────────────────────────────
        if pose_valid and hip_angle is not None and knee_angle is not None:
            self._update_state(hip_angle, knee_angle, spine_ok, feedback)

        # ── 8. Inactivity reset ──────────────────────────────────────────
        if pose_valid:
            self._last_active = time.time()
        elif time.time() - self._last_active > self.INACTIVE_THRESH:
            self._reset_session()

        # ── 9. Draw HUD ──────────────────────────────────────────────────
        self._draw_hud(out, h, w, feedback)

        return out, feedback

    # ── Bar detection via YOLO ────────────────────────────────────────────
    def _detect_bar(self, frame, h, w):
        """
        Returns (cx_norm, cy_norm, x1, y1, x2, y2) of best barbell candidate,
        or None if nothing found.

        Strategy:
          1. Run YOLOv8 on lower 70% of frame (bar is never above chest level)
          2. From all detections, pick the one with highest width/height ratio
             (barbells are wide and thin)
          3. If no high-aspect detection, fall back to the lowest bounding box
             (bar resting on floor)
        """
        yolo, ok = self._yolo_model()
        if not ok or yolo is None:
            return None

        roi_y = int(h * 0.15)          # crop from 15% down (exclude head)
        roi   = frame[roi_y:, :]

        try:
            results = yolo(roi, verbose=False, conf=0.15)[0]
        except Exception:
            return None

        best = None
        best_ratio = 0.0
        lowest_y = -1
        lowest_box = None

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            bw, bh = x2 - x1, y2 - y1
            if bw < 20 or bh < 3:
                continue
            ratio = bw / (bh + 1e-6)
            # Shift y back into full-frame coords
            y1 += roi_y; y2 += roi_y
            cx_n = ((x1 + x2) / 2) / w
            cy_n = ((y1 + y2) / 2) / h

            if ratio > best_ratio:
                best_ratio = ratio
                best = (cx_n, cy_n, x1, y1, x2, y2)

            if y2 > lowest_y:
                lowest_y = y2
                lowest_box = (cx_n, cy_n, x1, y1, x2, y2)

        # Use high-aspect box if ratio is convincing (bar-like), else lowest box
        if best is not None and best_ratio > 2.5:
            return best
        return lowest_box

    # ── Pose analysis ─────────────────────────────────────────────────────
    def _analyse_pose(self, lm, w, h, out, feedback):
        """Returns (valid, hip_angle, knee_angle, spine_ok, feedback)."""
        # Required joints for side-profile deadlift
        required = [11, 12, 23, 24, 25, 26, 27, 28]
        if not all(lm[i].visibility > 0.45 for i in required):
            cv2.putText(out, "Ensure full body is visible",
                        (20, 50), self._font, 0.7, (0, 165, 255), 2)
            return False, None, None, True, feedback

        # Determine which side is closer (lower z = closer)
        l_sh, r_sh = lm[11], lm[12]
        use_left = l_sh.z < r_sh.z

        # Key landmarks (whichever side is closer to camera)
        if use_left:
            sh  = _pt(lm, 11, w, h)
            hip = _pt(lm, 23, w, h)
            kn  = _pt(lm, 25, w, h)
            ank = _pt(lm, 27, w, h)
        else:
            sh  = _pt(lm, 12, w, h)
            hip = _pt(lm, 24, w, h)
            kn  = _pt(lm, 26, w, h)
            ank = _pt(lm, 28, w, h)

        # Shoulder width (both sides) — used for grip ratio
        l_sh_px = _pt(lm, 11, w, h)
        r_sh_px = _pt(lm, 12, w, h)

        # Angles
        vert_above_hip = (hip[0], hip[1] - 100)
        hip_angle   = _angle3(sh, hip, kn)          # torso-to-thigh
        knee_angle  = _angle3(hip, kn, ank)

        # Spine neutrality: use vertical ref above shoulder
        mid_sh = ((l_sh_px[0] + r_sh_px[0]) // 2, (l_sh_px[1] + r_sh_px[1]) // 2)
        spine_angle = _angle3(mid_sh, sh, (sh[0], sh[1] - 100))
        spine_ok = spine_angle < self.SPINE_ROUND_LIMIT

        # ── Draw skeleton ────────────────────────────────────────────────
        color_spine = (0, 200, 0) if spine_ok else (0, 0, 255)
        cv2.line(out, sh, hip, color_spine, 4)
        cv2.line(out, hip, kn,  (0, 220, 180), 4)
        cv2.line(out, kn,  ank, (0, 220, 180), 4)
        for pt in [sh, hip, kn, ank]:
            cv2.circle(out, pt, 7, (255, 255, 255), -1)
            cv2.circle(out, pt, 5, (30, 30, 30),    -1)

        # Angle labels
        cv2.putText(out, f"Hip:{int(hip_angle)}", (hip[0]+10, hip[1]-10),
                    self._font, 0.55, (255, 220, 0), 2)
        cv2.putText(out, f"Knee:{int(knee_angle)}", (kn[0]+10, kn[1]-10),
                    self._font, 0.55, (0, 220, 180), 2)

        # ── Form checks ──────────────────────────────────────────────────
        if not spine_ok:
            feedback.append("BACK ROUNDING — BRACE CORE & CHEST UP")
            self._rep_has_error = True

        # Check camera alignment (side-profile)
        sh_width = abs(l_sh_px[0] - r_sh_px[0])
        if sh_width > w * 0.18:
            feedback.append("STAND SIDEWAYS TO THE CAMERA")
            self._rep_has_error = True

        # Head / neck: nose should align roughly with spine
        nose = _pt(lm, 0, w, h)
        head_offset = abs(nose[0] - sh[0])
        if head_offset > w * 0.10 and hip_angle < self.HIP_HINGE_SETUP + 30:
            feedback.append("KEEP HEAD NEUTRAL — DON'T CRANE NECK")
            self._rep_has_error = True

        return True, hip_angle, knee_angle, spine_ok, feedback

    # ── Grip / hands analysis ─────────────────────────────────────────────
    def _analyse_grip(self, hands_res, pose_res, w, h, out, feedback):
        wrists = []
        for hlm in hands_res.multi_hand_landmarks:
            # Wrist = landmark 0 in MediaPipe Hands
            wr = hlm.landmark[0]
            wrists.append((int(wr.x * w), int(wr.y * h)))

            # Draw hand landmarks (subtle)
            mp_draw.draw_landmarks(
                out, hlm, mp_hands.HAND_CONNECTIONS,
                mp_draw.DrawingSpec(color=(200, 200, 60), thickness=1, circle_radius=3),
                mp_draw.DrawingSpec(color=(180, 180, 40), thickness=1)
            )

            # Wrist hyperextension: angle at wrist (index_mcp=5, wrist=0, pinky_mcp=17)
            wrist_pt = [hlm.landmark[0].x, hlm.landmark[0].y]
            idx_mcp  = [hlm.landmark[5].x, hlm.landmark[5].y]
            mid_mid  = [hlm.landmark[9].x, hlm.landmark[9].y]
            wrist_ang = _angle3(idx_mcp, wrist_pt, mid_mid)
            if wrist_ang > self.WRIST_HYPER_LIMIT:
                feedback.append("WRIST HYPEREXTENDING — CHECK GRIP")
                self._rep_has_error = True

        # Grip width ratio (only if both hands visible)
        if len(wrists) == 2 and pose_res.pose_landmarks:
            lm = pose_res.pose_landmarks.landmark
            l_sh_px = _pt(lm, 11, w, h)
            r_sh_px = _pt(lm, 12, w, h)
            sh_width  = max(abs(l_sh_px[0] - r_sh_px[0]), 1)
            grip_width = abs(wrists[0][0] - wrists[1][0])
            self.grip_width_ratio = round(grip_width / sh_width, 2)

            # Draw grip width line
            mid_y = (wrists[0][1] + wrists[1][1]) // 2
            cv2.line(out, (wrists[0][0], mid_y), (wrists[1][0], mid_y),
                     (255, 165, 0), 2)
            cv2.putText(out, f"Grip:{self.grip_width_ratio:.1f}x",
                        (min(wrists[0][0], wrists[1][0]), mid_y - 8),
                        self._font, 0.5, (255, 165, 0), 2)

            if self.grip_width_ratio > self.GRIP_WIDE_LIMIT:
                feedback.append("GRIP TOO WIDE — BRING HANDS CLOSER")
                self._rep_has_error = True
            elif self.grip_width_ratio < self.GRIP_NARROW_LIMIT:
                feedback.append("GRIP TOO NARROW — WIDEN YOUR HANDS")
                self._rep_has_error = True

        return feedback

    # ── State machine ─────────────────────────────────────────────────────
    def _update_state(self, hip_angle, knee_angle, spine_ok, feedback):
        prev = self.stage

        if self.stage == "setup":
            # Transition to PULL when hips start rising (hip angle increasing)
            if hip_angle > self.HIP_HINGE_SETUP + 20 and knee_angle > self.KNEE_BENT_SETUP:
                self.stage = "pull"
                self._rep_has_error = False
                self._reached_lockout = False
                self._bar_setup_x = None   # reset bar reference for this pull

        elif self.stage == "pull":
            # Hip-shooting check: hips extending faster than knees
            if hip_angle > 120 and knee_angle < 130:
                feedback.append("HIPS SHOOTING UP — DRIVE KNEES BACK")
                self._rep_has_error = True

            if hip_angle >= self.HIP_LOCKOUT and knee_angle >= self.HIP_LOCKOUT - 5:
                self.stage = "lockout"
                self._reached_lockout = True

        elif self.stage == "lockout":
            # Transition to LOWER when bar starts descending
            if hip_angle < self.HIP_LOCKOUT - 15:
                self.stage = "lower"

        elif self.stage == "lower":
            # Rep complete when back to setup position
            if hip_angle < self.HIP_HINGE_SETUP + 10:
                if self._reached_lockout:
                    if self._rep_has_error:
                        self.improper_count += 1
                    else:
                        self.deadlift_count += 1
                self._rep_has_error   = False
                self._reached_lockout = False
                self.stage = "setup"

    # ── Bar path trail ────────────────────────────────────────────────────
    def _draw_bar_trail(self, out, w, h):
        pts = list(self._bar_path)
        for i in range(1, len(pts)):
            p1 = (int(pts[i-1][0] * w), int(pts[i-1][1] * h))
            p2 = (int(pts[i][0]   * w), int(pts[i][1]   * h))
            alpha = i / len(pts)
            color = (int(60 * alpha), int(220 * alpha), int(120 * alpha))
            cv2.line(out, p1, p2, color, 2)
            cv2.circle(out, p2, 3, color, -1)

    # ── HUD overlay ───────────────────────────────────────────────────────
    def _draw_hud(self, out, h, w, feedback):
        # Semi-transparent top bar
        bar_h = 80
        ov = out.copy()
        cv2.rectangle(ov, (0, 38), (w, 38 + bar_h), (15, 15, 15), -1)
        cv2.addWeighted(ov, 0.70, out, 0.30, 0, out)

        form_ok   = len(feedback) == 0
        rep_color = (50, 220, 50) if form_ok else (50, 50, 255)

        cv2.putText(out, "DEADLIFT", (15, 65),
                    self._font, 0.65, (180, 180, 180), 1, cv2.LINE_AA)
        cv2.putText(out, str(self.deadlift_count), (15, 108),
                    self._font, 1.6, rep_color, 3, cv2.LINE_AA)
        cv2.putText(out, self.stage.upper(), (105, 108),
                    self._font, 0.75, (255, 255, 255), 2, cv2.LINE_AA)

        # Improper reps (right side)
        cv2.putText(out, "IMPROPER", (w - 175, 65),
                    self._font, 0.5, (150, 150, 150), 1, cv2.LINE_AA)
        cv2.putText(out, str(self.improper_count), (w - 155, 108),
                    self._font, 1.6, (80, 80, 255), 3, cv2.LINE_AA)

        # Bar drift indicator
        if self.bar_drift_px > 0:
            drift_pct = min(int(self.bar_drift_px / w * 100), 100)
            drift_color = (0, 200, 0) if drift_pct < 8 else (0, 60, 255)
            cv2.putText(out, f"Drift:{drift_pct}%", (15, 132),
                        self._font, 0.45, drift_color, 1, cv2.LINE_AA)

        # Grip ratio indicator
        if self.grip_width_ratio != 1.0:
            grip_color = (0, 200, 0) if self.GRIP_NARROW_LIMIT <= self.grip_width_ratio <= self.GRIP_WIDE_LIMIT else (0, 60, 255)
            cv2.putText(out, f"Grip:{self.grip_width_ratio:.1f}x sh-width",
                        (w - 220, 132), self._font, 0.42, grip_color, 1, cv2.LINE_AA)

        # Form-ok indicator (bottom-left corner)
        form_str   = "FORM OK" if form_ok else "CHECK FORM"
        form_color = (50, 220, 50) if form_ok else (50, 50, 255)
        cv2.putText(out, form_str, (15, h - 15),
                    self._font, 0.6, form_color, 2, cv2.LINE_AA)

        # Feedback banners (stacked from bottom)
        y_start = h - 60 - (len(feedback) - 1) * 48
        for i, msg in enumerate(feedback):
            y = y_start + i * 48
            if y > 38 + bar_h:
                bh = 40
                ov2 = out.copy()
                cv2.rectangle(ov2, (10, y), (w - 10, y + bh), (0, 30, 180), -1)
                cv2.addWeighted(ov2, 0.82, out, 0.18, 0, out)
                cv2.putText(out, msg, (18, y + bh - 10),
                            self._font, 0.62, (255, 255, 255), 2, cv2.LINE_AA)

    # ── Inactivity reset ──────────────────────────────────────────────────
    def _reset_session(self):
        self.deadlift_count  = 0
        self.improper_count  = 0
        self.stage           = "setup"
        self._rep_has_error  = False
        self._reached_lockout = False
        self._bar_setup_x    = None
        self._bar_path.clear()
        self.bar_drift_px    = 0.0
        self.grip_width_ratio = 1.0
        self._last_active    = time.time()
