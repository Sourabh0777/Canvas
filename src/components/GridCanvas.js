import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import TestModel from "./TestModel";

// Loading fallback component
const Loading = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={"orange"} />
  </mesh>
);

// Main component
const GridCanvas = () => {
  const threeDModelsList = [
    { name: "Low Poly Dummy", path: "/low-poly_test_dummy.glb" },
    { name: "Medieval Combat Dummy", path: "/medieval_combat_dummy.glb" },
    { name: "Tunnergp", path: "/tunnergp.glb" },
    { name: "Shopping", path: "/tunnergp.glb" },
  ];

  const [currentModel, setCurrentModel] = useState("/low-poly_test_dummy.glb");
  const modelRef = useRef();

  // Ref for depth rendering target (increased size for HD)
  const depthRenderTarget = useRef(
    new THREE.WebGLRenderTarget(window.innerWidth * 2, window.innerHeight * 2, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    })
  );

  const handleDragStart = (event, modelPath) => {
    event.dataTransfer.setData("modelPath", modelPath);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const modelPath = event.dataTransfer.getData("modelPath");
    if (modelPath) {
      setCurrentModel(modelPath);
      console.log("Current model updated to:", modelPath);
      window.dispatchEvent(new Event("resize"));
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleLogDepthMap = () => {
    if (modelRef.current) modelRef.current();
  };

  return (
    <div style={styles.container}>
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

        {/* Depth Map Button */}
        <button style={styles.button} onClick={handleLogDepthMap}>
          Capture Depth Map
        </button>
      </nav>

      <div style={styles.canvasWrapper} onDrop={handleDrop} onDragOver={handleDragOver}>
        <Canvas style={styles.canvas} camera={{ position: [0, 5, 10], fov: 75 }}>
          <CanvasContent
            currentModel={currentModel}
            depthRenderTarget={depthRenderTarget}
            setLogDepthMapRef={(ref) => (modelRef.current = ref)}
          />
        </Canvas>
      </div>
    </div>
  );
};

// Canvas Content Component
const CanvasContent = ({ currentModel, depthRenderTarget, setLogDepthMapRef }) => {
  const { gl, scene, camera } = useThree();

  const handleGetDepthMap = () => {
    // Clear color and set depth material
    gl.setRenderTarget(depthRenderTarget.current);
    gl.clearColor(1, 1, 1, 1); // Set to white for depth map
    gl.clear();
    
    // Disable lights and shadows for depth map rendering
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.depthWrite = true; // Ensure only depth is written
        child.material.depthTest = true; // Ensure depth testing is enabled
        child.material.visible = true; // Make sure mesh is visible
        // Optionally, you can set other properties if needed
        // e.g., child.material.transparent = false;
      }
    });
    
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    const width = depthRenderTarget.current.width;
    const height = depthRenderTarget.current.height;
    const depthPixels = new Uint8Array(width * height * 4); // RGBA format

    gl.readRenderTargetPixels(
      depthRenderTarget.current,
      0,
      0,
      width,
      height,
      depthPixels
    );

    // Flip the depth data vertically
    const flippedDepthData = [];
    for (let row = height - 1; row >= 0; row--) {
      for (let col = 0; col < width; col++) {
        const index = (row * width + col) * 4;
        flippedDepthData.push(depthPixels[index] / 255); // Extract grayscale value
      }
    }

    // Save flipped depth data as JSON
    const jsonData = JSON.stringify(flippedDepthData);
    const jsonBlob = new Blob([jsonData], { type: "application/json" });
    const jsonURL = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonURL;
    jsonLink.download = "depth-map.json";
    jsonLink.click();
    URL.revokeObjectURL(jsonURL);

    // Create canvas and flip image data for PNG
    const depthCanvas = document.createElement("canvas");
    depthCanvas.width = width; // Ensure canvas is HD
    depthCanvas.height = height; // Ensure canvas is HD
    const ctx = depthCanvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const srcIndex = ((height - row - 1) * width + col) * 4; // Flip vertically
        const destIndex = (row * width + col) * 4;

        // Remap depth value to a gradient (0-255)
        const depthValue = depthPixels[srcIndex] / 255; // Normalize to [0, 1]
        const gradientValue = Math.floor(depthValue * 255); // Scale to [0, 255]

        // Set the color based on depth value for gradient visualization
        imageData.data[destIndex] = gradientValue;     // Red channel
        imageData.data[destIndex + 1] = gradientValue; // Green channel
        imageData.data[destIndex + 2] = gradientValue; // Blue channel
        imageData.data[destIndex + 3] = 255;           // Alpha channel
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Save depth canvas as PNG
    depthCanvas.toBlob((blob) => {
      const imageURL = URL.createObjectURL(blob);
      const imageLink = document.createElement("a");
      imageLink.href = imageURL;
      imageLink.download = "depth-map.png";
      imageLink.click();
      URL.revokeObjectURL(imageURL);
    });
  };

  React.useEffect(() => {
    setLogDepthMapRef(handleGetDepthMap);
  }, [setLogDepthMapRef]);

  return (
    <>
      <Suspense fallback={<Loading />}>
        <gridHelper args={[100, 20, "white", "white"]} />
        <axesHelper args={[100]} />
        <OrbitControls />
        <ambientLight intensity={1} />
        <TestModel modelPath={currentModel} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
      </Suspense>
    </>
  );
};

export default GridCanvas;

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "250px 1fr",
    height: "100vh",
  },
  navbar: {
    background: "#333",
    color: "#fff",
    padding: "20px",
    overflowY: "auto",
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
    userSelect: "none",
  },
  canvasWrapper: {
    position: "relative",
    width: "100%",
    height: "100vh",
    backgroundColor: "#000",
  },
  canvas: {
    display: "block",
  },
  button: {
    marginTop: "20px",
    padding: "10px",
    backgroundColor: "#008CBA",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
