import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { Suspense, useState } from "react";
import TestModel from "./TestModel";

// Component for rendering a 3D model


// Loading fallback component
const Loading = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} /> {/* Use boxGeometry instead of boxBufferGeometry */}
    <meshStandardMaterial color={"orange"} />
  </mesh>
);

// Main component
const GridCanvas = () => {
  // List of 3D model paths
  const threeDModelsList = [
    { name: "Low Poly Dummy", path: "/low-poly_test_dummy.glb" },
    { name: "Medieval Combat Dummy", path: "/medieval_combat_dummy.glb" },
    { name: "Tunnergp", path: "/tunnergp.glb" },
  ];

  // State for currently selected model
  const [currentModel, setCurrentModel] = useState("/low-poly_test_dummy.glb");

  // Handle drag start
  const handleDragStart = (event, modelPath) => {
    event.dataTransfer.setData("modelPath", modelPath);
  };

  // Handle drop on canvas
  const handleDrop = (event) => {
    event.preventDefault();
    const modelPath = event.dataTransfer.getData("modelPath");
    if (modelPath) {
      setCurrentModel(modelPath); // Update the state with the new model path
      console.log("Current model updated to:", modelPath); // Log the updated model path
      window.dispatchEvent(new Event('resize')); // Force canvas to resize
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault(); // Prevent default to allow drop
  };

  return (
    <div style={styles.container}>
      {/* Vertical Navbar */}
      <nav style={styles.navbar}>
        <h2 style={styles.navTitle}>3D Models</h2>
        <ul style={styles.navList}>
          {threeDModelsList.map((model, index) => (
            <li
              key={index}
              style={styles.navItem}
              draggable
              onDragStart={(event) => handleDragStart(event, model.path)}
            >
              {model.name}
            </li>
          ))}
        </ul>
      </nav>

      {/* Canvas Area */}
      <div
        style={styles.canvasWrapper}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Canvas
          style={styles.canvas}
          camera={{ position: [0, 5, 10], fov: 75 }}
        >
          {/* Adding Suspense for lazy loading */}
          <Suspense fallback={<Loading />}>
            {/* Adding the grid helper */}
            <gridHelper args={[100, 20, "white", "white"]} />
            {/* Adding the axes helper for reference */}
            <axesHelper args={[100]} />
            {/* Enable orbit controls */}
            <OrbitControls />
            {/* Lighting */}
            <ambientLight intensity={1} />
            {/* Render the selected model */}
            <TestModel modelPath={currentModel} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default GridCanvas;

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "250px 1fr", // Left column for navbar, right for canvas
    height: "100vh",
  },
  navbar: {
    background: "#333",
    color: "#fff",
    padding: "20px",
    overflowY: "auto", // Allow scrolling if the list gets too long
  },
  navTitle: {
    margin: "0 0 20px",
  },
  navList: {
    listStyle: "none",
    padding: "0",
  },
  navItem: {
    margin: "10px 0",
    cursor: "pointer",
    padding: "10px",
    background: "#444",
    color: "#fff",
    borderRadius: "5px",
    textAlign: "center",
    userSelect: "none", // Prevent text selection during drag
  },
  canvasWrapper: {
    position: "relative",
    width: "100%",
    height: "100vh",
    backgroundColor: "#000", // Ensures consistent background color for canvas
  },
  canvas: {
    display: "block",
  },
};
