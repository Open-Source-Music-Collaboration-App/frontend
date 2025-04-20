import React, { useState } from "react";
import axios from "axios";

const AudioCompare = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (event, setFile) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);

    try {
      const response = await axios.post(
        "http://localhost:3000/compare",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setResult(response.data);
    } catch (error) {
      console.error(error);
      setResult("Error comparing files");
    }
  };

  return (
    <div className="audio-compare">
      <h1>Audio Comparison Tool</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Upload File 1:
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileChange(e, setFile1)}
            />
          </label>
        </div>
        <div>
          <label>
            Upload File 2:
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileChange(e, setFile2)}
            />
          </label>
        </div>
        <button type="submit" disabled={!file1 || !file2}>
          Compare
        </button>
      </form>
      {result && <div className="result">{JSON.stringify(result)}</div>}
    </div>
  );
};

export default AudioCompare;
