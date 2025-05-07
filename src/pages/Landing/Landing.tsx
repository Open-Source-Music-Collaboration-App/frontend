import { useNavigate } from "react-router-dom";
import "./Landing.css";

import LandingHeader from "../../components/LandingHeader/LandingHeader";
import LandingFooter from "../../components/LandingFooter/LandingFooter";

import repository from '../../assets/repository.png';
import diffImage from '../../assets/diff.png';

function Landing() {
  const navigate = useNavigate(); // React Router navigation hook

  return (
    <>
      <div className="flex flex-col items-center justify-center landingcontainer">
        {/* <LandingHeader /> */}
        <div className="herowrapper text-center">
          <h1 className="font-bold text-white">
            Create and evolve music through open-source collaboration
          </h1>
          <h3 className="subtitle text-gray-400 mt-5">
            Join a community where musicians openly create, refine, and innovate together.
          </h3>

          <div className="flex justify-center mt-12 splitrow">
            <div className="inputwrapper">
              <input
                type="email"
                id="email"
                className="p-3 text-black w-72 border-none outline-none"
                placeholder="Enter your email"
              />
              <button className="buttonfill" onClick={() => navigate("/login")}>
                Sign up for OpenSynq
              </button>
            </div>

            <button className="buttonoutline ml-4" onClick={() => navigate("/dashboard")} style={{ width: "200px" }}>
              Explore projects
            </button>
          </div>
        </div>
        
        <div className="sectionwrapper text-center">
            <h1 className="font-bold text-white">
                Collaborate with musicians from around the world
            </h1>
            <h3 className="subtitle text-gray-400 mt-5">
                OpenSynq provides version control, diffs, and pull requests for music projects.
            </h3>
            <img src={repository} alt="landing" style={{ 
                boxShadow: "0px 0px 20px 0px #fff2",
                borderRadius: "10px",
                marginTop: "50px",
                
              }}/>
              </div>
      
              {/* Diffing Section */}
              <div className="sectionwrapper text-center">
                  <h1 className="font-bold text-white">
                      Visualize Every Change with Version Diffing
                  </h1>
                  <h3 className="subtitle text-gray-400 mt-5">
                      See exactly what changed between versions with our intuitive visual diff tool, designed specifically for music projects.
                  </h3>
                  {/* Placeholder for the diff image */}
                  {/* <div style={{
                      width: '80%', // Adjust width as needed
                      maxWidth: '1000px', // Max width for larger screens
                      height: '400px', // Adjust height as needed
                      backgroundColor: '#2a2a3a', // Placeholder background
                      border: '1px dashed #555',
                      borderRadius: '10px',
                      marginTop: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#888',
                      boxShadow: "0px 0px 20px 0px #fff2",
                      margin: '50px auto 0' // Center the placeholder
                      }}>
                      [Diff Viewer Image Placeholder]
                  </div> */}
                  
                  <img src={diffImage} alt="Visual Diff Tool" style={{
                      boxShadow: "0px 0px 20px 0px #fff2",
                      borderRadius: "10px",
                      marginTop: "50px",
                  }}/>
                 
              </div>
              {/* End Diffing Section */}
      
              <LandingFooter />
            </div>
          </>
        );
      }

export default Landing;