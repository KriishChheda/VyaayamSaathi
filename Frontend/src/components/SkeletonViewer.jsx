import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─── Joint positions for each calibration pose ─────────────────────────────────
// Y-up coordinate system; body centered at origin, ~1.7 units tall

const JOINT_NAMES = [
  'head', 'neck',
  'l_shoulder', 'l_elbow', 'l_wrist',
  'r_shoulder', 'r_elbow', 'r_wrist',
  'hip_center',
  'l_hip', 'l_knee', 'l_ankle',
  'r_hip', 'r_knee', 'r_ankle',
];

const BONES = [
  ['head', 'neck'],
  ['neck', 'l_shoulder'], ['neck', 'r_shoulder'],
  ['l_shoulder', 'l_elbow'], ['l_elbow', 'l_wrist'],
  ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_wrist'],
  ['neck', 'hip_center'],
  ['hip_center', 'l_hip'], ['hip_center', 'r_hip'],
  ['l_hip', 'l_knee'], ['l_knee', 'l_ankle'],
  ['r_hip', 'r_knee'], ['r_knee', 'r_ankle'],
];

// Pose definitions: joint → [x, y, z]
const POSES = {
  // Step 1: Arms relaxed at sides
  arms_down: {
    head:       [0, 1.65, 0],
    neck:       [0, 1.45, 0],
    l_shoulder: [-0.22, 1.4, 0],
    l_elbow:    [-0.24, 1.1, 0],
    l_wrist:    [-0.22, 0.8, 0],
    r_shoulder: [0.22, 1.4, 0],
    r_elbow:    [0.24, 1.1, 0],
    r_wrist:    [0.22, 0.8, 0],
    hip_center: [0, 0.9, 0],
    l_hip:      [-0.15, 0.85, 0],
    l_knee:     [-0.16, 0.45, 0],
    l_ankle:    [-0.16, 0.05, 0],
    r_hip:      [0.15, 0.85, 0],
    r_knee:     [0.16, 0.45, 0],
    r_ankle:    [0.16, 0.05, 0],
  },
  // Step 2: Goalpost — elbows at shoulder height, bent 90°
  goalpost: {
    head:       [0, 1.65, 0],
    neck:       [0, 1.45, 0],
    l_shoulder: [-0.22, 1.4, 0],
    l_elbow:    [-0.48, 1.4, 0],
    l_wrist:    [-0.48, 1.72, 0],
    r_shoulder: [0.22, 1.4, 0],
    r_elbow:    [0.48, 1.4, 0],
    r_wrist:    [0.48, 1.72, 0],
    hip_center: [0, 0.9, 0],
    l_hip:      [-0.15, 0.85, 0],
    l_knee:     [-0.16, 0.45, 0],
    l_ankle:    [-0.16, 0.05, 0],
    r_hip:      [0.15, 0.85, 0],
    r_knee:     [0.16, 0.45, 0],
    r_ankle:    [0.16, 0.05, 0],
  },
  // Step 3: Arms overhead — fully extended
  arms_up: {
    head:       [0, 1.65, 0],
    neck:       [0, 1.45, 0],
    l_shoulder: [-0.22, 1.4, 0],
    l_elbow:    [-0.24, 1.7, 0],
    l_wrist:    [-0.22, 2.0, 0],
    r_shoulder: [0.22, 1.4, 0],
    r_elbow:    [0.24, 1.7, 0],
    r_wrist:    [0.22, 2.0, 0],
    hip_center: [0, 0.9, 0],
    l_hip:      [-0.15, 0.85, 0],
    l_knee:     [-0.16, 0.45, 0],
    l_ankle:    [-0.16, 0.05, 0],
    r_hip:      [0.15, 0.85, 0],
    r_knee:     [0.16, 0.45, 0],
    r_ankle:    [0.16, 0.05, 0],
  },
};

const STEP_POSE_MAP = ['arms_down', 'goalpost', 'arms_up'];

// Which joints to highlight per step
const HIGHLIGHT_JOINTS = {
  0: ['l_elbow', 'r_elbow', 'l_shoulder', 'r_shoulder'], // arms down — capture resting angles
  1: ['l_elbow', 'r_elbow', 'l_shoulder', 'r_shoulder'], // goalpost — capture 90° bend
  2: ['l_elbow', 'r_elbow', 'l_wrist', 'r_wrist'],       // overhead — capture lockout + wrist
};

// Which bones to highlight per step
const HIGHLIGHT_BONES = {
  0: [['l_shoulder', 'l_elbow'], ['l_elbow', 'l_wrist'], ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_wrist']],
  1: [['l_shoulder', 'l_elbow'], ['l_elbow', 'l_wrist'], ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_wrist']],
  2: [['l_shoulder', 'l_elbow'], ['l_elbow', 'l_wrist'], ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_wrist']],
};

// ─── Colors ─────────────────────────────────────────────────────────────────
const COLOR_BONE       = '#64748b'; // slate-500
const COLOR_JOINT      = '#94a3b8'; // slate-400
const COLOR_HIGHLIGHT  = '#10b981'; // emerald-500
const COLOR_GLOW       = '#34d399'; // emerald-400

// ─── Animated Joint ─────────────────────────────────────────────────────────
function Joint({ position, isHighlighted }) {
  const ref = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    if (isHighlighted && glowRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      glowRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[isHighlighted ? 0.035 : 0.025, 16, 16]} />
        <meshStandardMaterial
          color={isHighlighted ? COLOR_HIGHLIGHT : COLOR_JOINT}
          emissive={isHighlighted ? COLOR_GLOW : '#000'}
          emissiveIntensity={isHighlighted ? 0.6 : 0}
        />
      </mesh>
      {isHighlighted && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color={COLOR_GLOW}
            transparent
            opacity={0.2}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── Bone (cylinder between two joints) ──────────────────────────────────────
function Bone({ start, end, isHighlighted }) {
  const mesh = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(e, s);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);

    const geometry = new THREE.CylinderGeometry(
      isHighlighted ? 0.018 : 0.012,
      isHighlighted ? 0.018 : 0.012,
      len,
      8
    );

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );

    return { position: mid.toArray(), quaternion, geometry, length: len };
  }, [start, end, isHighlighted]);

  return (
    <mesh
      position={mesh.position}
      quaternion={mesh.quaternion}
      geometry={mesh.geometry}
    >
      <meshStandardMaterial
        color={isHighlighted ? COLOR_HIGHLIGHT : COLOR_BONE}
        emissive={isHighlighted ? COLOR_GLOW : '#000'}
        emissiveIntensity={isHighlighted ? 0.3 : 0}
      />
    </mesh>
  );
}

// ─── Ground grid ─────────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
    </mesh>
  );
}

// ─── Skeleton body ───────────────────────────────────────────────────────────
function SkeletonBody({ step }) {
  const poseName = STEP_POSE_MAP[step] || 'arms_down';
  const pose = POSES[poseName];
  const highlightedJoints = new Set(HIGHLIGHT_JOINTS[step] || []);
  const highlightedBonesSet = new Set(
    (HIGHLIGHT_BONES[step] || []).map(b => b.join('-'))
  );

  const groupRef = useRef();

  // Gentle idle rotation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.85, 0]}>
      {/* Joints */}
      {JOINT_NAMES.map(name => (
        <Joint
          key={name}
          position={pose[name]}
          isHighlighted={highlightedJoints.has(name)}
        />
      ))}

      {/* Bones */}
      {BONES.map(([a, b]) => {
        const boneKey = `${a}-${b}`;
        const isHL = highlightedBonesSet.has(boneKey) || highlightedBonesSet.has(`${b}-${a}`);
        return (
          <Bone
            key={boneKey}
            start={pose[a]}
            end={pose[b]}
            isHighlighted={isHL}
          />
        );
      })}
    </group>
  );
}

// ─── Main exported component ─────────────────────────────────────────────────
export default function SkeletonViewer({ step = 0 }) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: 220 }}>
      <Canvas
        camera={{ position: [0, 0.3, 2.8], fov: 35 }}
        style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={0.8} />
        <pointLight position={[-2, 3, -1]} intensity={0.4} color="#6366f1" />
        <pointLight position={[2, 1, 2]} intensity={0.3} color="#10b981" />

        <SkeletonBody step={step} />
        <Ground />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1.5}
          maxDistance={5}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.7}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
