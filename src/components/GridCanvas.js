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
    // Create a custom depth material to render the model in white
    const depthMaterial = new THREE.MeshDepthMaterial();
    depthMaterial.color = new THREE.Color(1, 1, 1); // White for the model
    
    // Store original materials, apply depth material to only model meshes, and disable shadows
    const originalMaterials = {};
    scene.traverse((child) => {
      if (child.isMesh) {
        originalMaterials[child.uuid] = child.material; // Store original material
        child.material = depthMaterial; // Apply depth material with white color
        child.castShadow = false; // Disable shadow casting
        child.receiveShadow = false; // Disable shadow receiving
      }
    });
  
    // Render with a black background
    gl.setRenderTarget(depthRenderTarget.current);
    gl.clearColor(0, 0, 0, 1); // Set black background color
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
  
    // Restore original materials after rendering
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = originalMaterials[child.uuid];
      }
    });
  
    const width = depthRenderTarget.current.width;
    const height = depthRenderTarget.current.height;
    const depthPixels = new Uint8Array(width * height * 4); // RGBA format
  
    // Read pixel data
    gl.readRenderTargetPixels(
      depthRenderTarget.current,
      0,
      0,
      width,
      height,
      depthPixels
    );
  
    // Flip depth data vertically for JSON output
    const flippedDepthData = [];
    for (let row = height - 1; row >= 0; row--) {
      for (let col = 0; col < width; col++) {
        const index = (row * width + col) * 4;
        flippedDepthData.push(depthPixels[index] / 255); // Normalize depth to [0, 1]
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
    depthCanvas.width = width;
    depthCanvas.height = height;
    const ctx = depthCanvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);
  
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const srcIndex = ((height - row - 1) * width + col) * 4;
        const destIndex = (row * width + col) * 4;
  
        // White for model depth; black for background
        const depthValue = depthPixels[srcIndex] / 255; // Normalize to [0, 1]
        const gradientValue = depthValue > 0 ? 255 : 0; // Set model to white, background to black
  
        // Set the color for depth map with black background and white model
        imageData.data[destIndex] = gradientValue;
        imageData.data[destIndex + 1] = gradientValue;
        imageData.data[destIndex + 2] = gradientValue;
        imageData.data[destIndex + 3] = 255; // Alpha channel
      }
    }
  
    ctx.putImageData(imageData, 0, 0);
  
    // Save canvas as PNG
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
