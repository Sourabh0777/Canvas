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
  ];

  const [currentModel, setCurrentModel] = useState("/low-poly_test_dummy.glb");
  const modelRef = useRef();

  // Ref for depth rendering target
  const depthRenderTarget = useRef(
    new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
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
    // Render the scene to the depth render target
    gl.setRenderTarget(depthRenderTarget.current);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    // Extract depth data from the render target's texture
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

    // Create JSON depth map data
    const depthData = [];
    for (let i = 0; i < depthPixels.length; i += 4) {
      // Extract grayscale depth value from the red channel
      depthData.push(depthPixels[i] / 255); // Normalize between 0 and 1
    }

    const jsonData = JSON.stringify(depthData);
    const jsonBlob = new Blob([jsonData], { type: "application/json" });
    const jsonURL = URL.createObjectURL(jsonBlob);

    // Download JSON
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonURL;
    jsonLink.download = "depth-map.json";
    jsonLink.click();
    URL.revokeObjectURL(jsonURL);

    // Create a canvas to visualize the depth data
    const depthCanvas = document.createElement("canvas");
    depthCanvas.width = width;
    depthCanvas.height = height;
    const ctx = depthCanvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < depthPixels.length; i += 4) {
      const depthValue = depthPixels[i]; // Red channel for grayscale depth
      imageData.data[i] = depthValue;
      imageData.data[i + 1] = depthValue;
      imageData.data[i + 2] = depthValue;
      imageData.data[i + 3] = 255; // Alpha channel
    }
    ctx.putImageData(imageData, 0, 0);

    // Save the depth canvas as a PNG image
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
    backgroundColor: "#555",
    color: "#fff",
    borderRadius: "5px",
    textAlign: "center",
    cursor: "pointer",
  },
};
