import { useLoader } from "@react-three/fiber";
import React, { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const TestModel = ({ modelPath }) => {
  const [model, setModel] = useState(null);
  const gltf = useLoader(GLTFLoader, modelPath); // Load the model based on the prop

  useEffect(() => {
    if (gltf) {
      setModel(gltf.scene); // Set the loaded model to state
    }
  }, [gltf]);

  return model ? <primitive object={model} /> : null; // Render the model if available
};

export default TestModel;