import cv2
import mediapipe as mp
import numpy as np
import math
import time

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

def calculate_angle(a, b, c):
    try:
        ba = np.array(a) - np.array(b)
        bc = np.array(c) - np.array(b)
        mag_ba = np.linalg.norm(ba)
        mag_bc = np.linalg.norm(bc)
        if mag_ba == 0 or mag_bc == 0:
            return None
        cosine = np.clip(np.dot(ba, bc) / (mag_ba * mag_bc), -1.0, 1.0)
        return math.degrees(math.acos(cosine))
    except Exception:
        return None

def upper_arm_angle_from_vertical(shoulder, elbow):
    arm_vec = np.array([elbow[0] - shoulder[0], elbow[1] - shoulder[1]])
    down_vec = np.array([0, 1])
    mag_arm = np.linalg.norm(arm_vec)
    if mag_arm == 0:
        return 0
    cosine = np.clip(np.dot(arm_vec, down_vec) / mag_arm, -1.0, 1.0)
    return math.degrees(math.acos(cosine))

def draw_banner(img, msg, y_pos, bg_color, h, w):
    bh = 45
    ov = img.copy()
    cv2.rectangle(ov, (10, y_pos), (w - 10, y_pos + bh), bg_color, -1)
    cv2.addWeighted(ov, 0.85, img, 0.15, 0, img)
    cv2.rectangle(img, (10, y_pos), (w - 10, y_pos + bh), (255, 255, 255), 2, cv2.LINE_AA)
    ts = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)[0]
    cv2.putText(img, msg, ((w - ts[0]) // 2, y_pos + bh - 12),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)

def draw_form_status(img, is_good, h, w):
    label = "FORM: GOOD" if is_good else "FORM: FIX"
    bg = (0, 180, 0) if is_good else (0, 0, 200)
    ts = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 3)[0]
    bw, bh = ts[0] + 30, ts[1] + 20
    x = (w - bw) // 2
    ov = img.copy()
    cv2.rectangle(ov, (x, 5), (x + bw, 5 + bh), bg, -1)
    cv2.addWeighted(ov, 0.8, img, 0.2, 0, img)
    cv2.rectangle(img, (x, 5), (x + bw, 5 + bh), (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(img, label, (x + 15, 5 + bh - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 3, cv2.LINE_AA)

# ─── Front Raise Thresholds ───
ANGLE_TOP = 75         # Degrees from vertical (arm roughly parallel to ground)
ANGLE_BOTTOM = 25      # Degrees from vertical (arm mostly hanging down)
MIN_ELBOW_STRAIGHTNESS = 140  # Minimum angle for elbow to enforce straight arms


class FrontRaiseArmTracker:
    def __init__(self, name):
        self.name = name
        self.stage = 'down'        # 'down' = at sides, 'up' = raised in front
        self.is_valid_position = False
        self.upper_arm_deg = 0
        self.elbow_angle = None
        self.bad_position_reason = None
        self.bad_position_frames = 0
        self.show_bad_position = False

    def update(self, elbow_angle, shoulder_xy, elbow_xy):
        if elbow_angle is None:
            self.is_valid_position = False
            self.bad_position_reason = None
            self.show_bad_position = False
            return None, False

        self.elbow_angle = elbow_angle
        form_issue = None
        self.bad_position_reason = None

        self.upper_arm_deg = upper_arm_angle_from_vertical(shoulder_xy, elbow_xy)

        # CHECK: Elbow straightness
        if elbow_angle < MIN_ELBOW_STRAIGHTNESS and self.upper_arm_deg > (ANGLE_BOTTOM + 15):
            self.bad_position_frames += 1
            self.is_valid_position = False
            if self.bad_position_frames >= 5:
                self.show_bad_position = True
                self.bad_position_reason = f"{self.name}: KEEP ARM STRAIGHT"
                return self.bad_position_reason, False
            else:
                self.show_bad_position = False
                return None, True
        else:
            self.bad_position_frames = 0
            self.show_bad_position = False
            self.is_valid_position = True

        # Stage transitions based purely on elevation
        if self.upper_arm_deg >= ANGLE_TOP:
            self.stage = 'up'
        elif self.upper_arm_deg <= ANGLE_BOTTOM:
            self.stage = 'down'

        return form_issue, True
