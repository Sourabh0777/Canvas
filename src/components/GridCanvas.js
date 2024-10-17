import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React from "react";
const TestModel = () => {
  const { scene } = useGLTF("/low-poly_test_dummy.glb"); // Correct path

  return <primitive object={scene} />;
};
const GridCanvas = () => {
  return (
    <Canvas
      style={{
        background: "black",
        width: "auto",
        height: "100vh",
        marginTop: "50px",
        marginLeft: "50px",
      }}
      camera={{ position: [0, 5, 10], fov: 75 }} // Set initial camera position here
    >
      {/* Adding the grid helper */}
      <gridHelper args={[100, 20, "white", "white"]} />{" "}
      {/* Reduced divisions for better visibility */}
      {/* Adding the axes helper for reference */}
      <axesHelper args={[100]} />
      {/* Enable orbit controls */}
      <OrbitControls />
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <TestModel />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </Canvas>
  );
};

export default GridCanvas;
