from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
import base64
import json
from auth import router as auth_router # Import the new router

# FastAPI is a backend framework,
# websockets enable real time streaming of data between client and server
# base64 is used to encode and decode images
# cv2 is used for image processing
# numpy is used for numerical operations
# json is used to format data

app = FastAPI() # created a FastAPI application where i will mount all the endpoints

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# data is a base64 encoded image coming from the frontend which is in string format.
def decode_base64_frame(data):
    img_bytes = base64.b64decode(data) # we convert the image to bytes
    np_arr = np.frombuffer(img_bytes, np.uint8) # convert the array of bytes to numpy array
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR) # decode the numpy array to image
    return frame


def encode_frame(frame):
    _, buffer = cv2.imencode(".jpg", frame)
    return base64.b64encode(buffer).decode("utf-8")

# this is a fastAPI decorator which is used to define a websocket endpoint
@app.websocket("/wsbicep")
async def websocket_bicep(ws: WebSocket):
    await ws.accept() # upgrades the connection from http to websocket

    from bicep_processor import ProcessFrameBicep
    # ProcessFrameBicep is a class that processes the frames for bicep curls
    from run_curl import pose # this is the mediapipe pose model

    processor = ProcessFrameBicep(flip_frame=True)
    # here i made an object of the class which will process each frame one by one
    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, form_issues = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)

            stats = {
                "frame": encoded,
                "form_ok": len(form_issues) == 0,
                "feedback": form_issues,          # list of plain-text correction strings
                "left": {
                    "reps": processor.left_arm.counter,
                    "half_reps": processor.left_arm.half_reps,
                    "stage": processor.left_arm.stage,
                },
                "right": {
                    "reps": processor.right_arm.counter,
                    "half_reps": processor.right_arm.half_reps,
                    "stage": processor.right_arm.stage,
                },
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break


@app.websocket("/wssquat")
async def websocket_squat(ws: WebSocket):
    await ws.accept()

    from utils import get_mediapipe_pose
    from process_frame_squats import ProcessFrame
    from thresholds import get_thresholds_beginner

    thresholds = get_thresholds_beginner()
    pose = get_mediapipe_pose()
    processor = ProcessFrame(thresholds=thresholds, flip_frame=True)

    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, play_sound, feedback_msgs = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)

            st = processor.state_tracker
            has_errors = bool(
                any(st['DISPLAY_TEXT']) or st['LOWER_HIPS']
            )

            stats = {
                "frame": encoded,
                "squat_count":   st['SQUAT_COUNT'],
                "improper_squat": st['IMPROPER_SQUAT'],
                "curr_state":    st['curr_state'],      # 's1' | 's2' | 's3' | None
                "form_ok":       not has_errors,
                "feedback":      feedback_msgs,
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break


@app.websocket("/wspress")
async def websocket_press(ws: WebSocket):
    await ws.accept()

    from press_processor import ProcessFramePress
    from run_press import pose

    # First message may be a JSON config with calibration thresholds
    custom_thresholds = None
    first_msg = await ws.receive_text()
    first_frame = None
    try:
        config = json.loads(first_msg)
        if isinstance(config, dict) and "thresholds" in config:
            custom_thresholds = config["thresholds"]
            print(f"🎯 Using custom calibration thresholds: {custom_thresholds}")
    except (json.JSONDecodeError, TypeError):
        # Not JSON — treat as a frame
        first_frame = first_msg

    processor = ProcessFramePress(flip_frame=True, custom_thresholds=custom_thresholds)

    # Process the first frame if it wasn't a config message
    if first_frame is not None:
        try:
            frame = decode_base64_frame(first_frame)
            processed_frame, form_issues = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)
            stats = {
                "frame": encoded,
                "form_ok": len(form_issues) == 0,
                "feedback": form_issues,
                "press_counter": processor.press_counter,
                "stage": 'up' if processor.left_arm.stage == 'up' and processor.right_arm.stage == 'up' else 'down'
            }
            await ws.send_text(json.dumps(stats))
        except Exception as e:
            print("🔥 ERROR on first frame:", e)

    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, form_issues = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)

            stats = {
                "frame": encoded,
                "form_ok": len(form_issues) == 0,
                "feedback": form_issues,
                "press_counter": processor.press_counter,
                "stage": 'up' if processor.left_arm.stage == 'up' and processor.right_arm.stage == 'up' else 'down'
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break


@app.websocket("/wscalibrate")
async def websocket_calibrate(ws: WebSocket):
    """
    Calibration WebSocket: processes frames and returns real-time angle data
    for the calibration wizard. No rep counting or form checking — just angles.
    """
    await ws.accept()

    import mediapipe as mp_lib
    from run_press import calculate_angle, upper_arm_angle_from_vertical, mp_pose, mp_drawing, mp_drawing_styles

    pose_instance = mp_lib.solutions.pose.Pose(
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    )

    while True:
        try:
            data = await ws.receive_text()
            frame = decode_base64_frame(data)
            frame = cv2.flip(frame, 1)  # mirror

            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image_rgb.flags.writeable = False
            results = pose_instance.process(image_rgb)

            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            image_bgr.flags.writeable = True
            h, w, _ = image_bgr.shape

            angles = {
                "pose_detected": False,
                "left_elbow_angle": None,
                "right_elbow_angle": None,
                "left_upper_arm_elevation": None,
                "right_upper_arm_elevation": None,
                "wrist_y_diff": None,
                "left_wrist_drift": None,
                "right_wrist_drift": None,
            }

            if results.pose_landmarks:
                lm = results.pose_landmarks.landmark
                angles["pose_detected"] = True

                # Left arm (MediaPipe RIGHT due to mirror)
                l_vis = all(lm[idx.value].visibility > 0.5 for idx in [
                    mp_pose.PoseLandmark.RIGHT_SHOULDER,
                    mp_pose.PoseLandmark.RIGHT_ELBOW,
                    mp_pose.PoseLandmark.RIGHT_WRIST,
                ])
                if l_vis:
                    l_sh = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
                    l_el = lm[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
                    l_wr = lm[mp_pose.PoseLandmark.RIGHT_WRIST.value]
                    angles["left_elbow_angle"] = calculate_angle(
                        [l_sh.x, l_sh.y], [l_el.x, l_el.y], [l_wr.x, l_wr.y])
                    angles["left_upper_arm_elevation"] = upper_arm_angle_from_vertical(
                        [l_sh.x, l_sh.y], [l_el.x, l_el.y])
                    angles["left_wrist_drift"] = abs(l_wr.x - l_el.x)

                # Right arm (MediaPipe LEFT due to mirror)
                r_vis = all(lm[idx.value].visibility > 0.5 for idx in [
                    mp_pose.PoseLandmark.LEFT_SHOULDER,
                    mp_pose.PoseLandmark.LEFT_ELBOW,
                    mp_pose.PoseLandmark.LEFT_WRIST,
                ])
                if r_vis:
                    r_sh = lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
                    r_el = lm[mp_pose.PoseLandmark.LEFT_ELBOW.value]
                    r_wr = lm[mp_pose.PoseLandmark.LEFT_WRIST.value]
                    angles["right_elbow_angle"] = calculate_angle(
                        [r_sh.x, r_sh.y], [r_el.x, r_el.y], [r_wr.x, r_wr.y])
                    angles["right_upper_arm_elevation"] = upper_arm_angle_from_vertical(
                        [r_sh.x, r_sh.y], [r_el.x, r_el.y])
                    angles["right_wrist_drift"] = abs(r_wr.x - r_el.x)

                # Wrist height difference (symmetry)
                if l_vis and r_vis:
                    angles["wrist_y_diff"] = abs(
                        lm[mp_pose.PoseLandmark.RIGHT_WRIST.value].y -
                        lm[mp_pose.PoseLandmark.LEFT_WRIST.value].y
                    )

                # Draw landmarks
                mp_drawing.draw_landmarks(
                    image_bgr, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())

            encoded = encode_frame(image_bgr)
            await ws.send_text(json.dumps({"frame": encoded, "angles": angles}))

        except Exception as e:
            print("🔥 CALIBRATION ERROR:", e)
            import traceback
            traceback.print_exc()
            break

    pose_instance.close()


@app.websocket("/wslunge")
async def websocket_lunge(ws: WebSocket):
    await ws.accept()

    from lunge_processor import ProcessFrameLunge
    from run_curl import pose # Reuse the standard pose instance

    processor = ProcessFrameLunge(flip_frame=True)

    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, form_issues = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)

            stats = {
                "frame": encoded,
                "form_ok": len(form_issues) == 0,
                "feedback": form_issues,
                "lunge_count": processor.lunge_count,
                "improper_lunge": processor.improper_lunge,
                "stage": processor.stage
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break


@app.websocket("/wshammer")
async def websocket_hammer(ws: WebSocket):
    await ws.accept()

    from bicep_processor import ProcessFrameBicep
    from run_curl import pose 

    processor = ProcessFrameBicep(flip_frame=True)
    
    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, form_issues = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)

            stats = {
                "frame": encoded,
                "form_ok": len(form_issues) == 0,
                "feedback": form_issues,
                "left": {
                    "reps": processor.left_arm.counter,
                    "half_reps": processor.left_arm.half_reps,
                    "stage": processor.left_arm.stage,
                },
                "right": {
                    "reps": processor.right_arm.counter,
                    "half_reps": processor.right_arm.half_reps,
                    "stage": processor.right_arm.stage,
                },
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break


@app.websocket("/wsfrontraise")
async def websocket_front_raise(ws: WebSocket):
    await ws.accept()

    from front_raise_processor import ProcessFrameFrontRaise
    from run_front_raise import pose 

    processor = ProcessFrameFrontRaise(flip_frame=True)
    
    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, form_issues = processor.process(frame, pose)
            encoded = encode_frame(processed_frame)

            stats = {
                "frame": encoded,
                "form_ok": len(form_issues) == 0,
                "feedback": form_issues,
                "press_counter": processor.press_counter, # Unified counter for both arms
                "stage": 'up' if processor.left_arm.stage == 'up' and processor.right_arm.stage == 'up' else 'down'
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break


@app.websocket("/wsdeadlift")
async def websocket_deadlift(ws: WebSocket):
    await ws.accept()

    from deadlift_processor import ProcessFrameDeadlift

    # Processor self-initialises both MediaPipe (Pose + Hands) and YOLOv8
    processor = ProcessFrameDeadlift(flip_frame=True)

    while True:
        try:
            data = await ws.receive_text()

            frame = decode_base64_frame(data)
            processed_frame, form_issues = processor.process(frame)
            encoded = encode_frame(processed_frame)

            stats = {
                "frame":              encoded,
                "form_ok":            len(form_issues) == 0,
                "feedback":           form_issues,
                "deadlift_count":     processor.deadlift_count,
                "improper_deadlift":  processor.improper_count,
                "stage":              processor.stage,
                "bar_drift_px":       round(processor.bar_drift_px, 1),
                "grip_width_ratio":   processor.grip_width_ratio,
            }

            await ws.send_text(json.dumps(stats))

        except Exception as e:
            print("🔥 ERROR:", e)
            import traceback
            traceback.print_exc()
            break