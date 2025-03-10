import styled from 'styled-components';

const SendButton = ({type, disabled}: {type: "button" | "submit" | "reset" | undefined, disabled: boolean}) => {
  return (
    <StyledWrapper>
      <button type={type} disabled={disabled}>
        <div className="svg-wrapper-1">
          <div className="svg-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18}>
              <path fill="none" d="M0 0h24v24H0z" />
              <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" />
            </svg>
          </div>
        </div>
        {/* <span>Send</span> */}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  button {
    font-family: inherit;
    font-size: 20px;
    background-color: rgba(147, 0, 215, 0.4);
    color: white;
    padding: 10px 10px; 
    display: flex;
    align-items: center;
    border: none;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s;
    cursor: pointer;
  }

  button span {
    display: block;
    margin-left: 0.3em;
    transition: all 0.3s ease-in-out;
  }

  button svg {
    display: block;
    transform-origin: center center;
    transition: transform 0.3s ease-in-out;
  }

  button:hover .svg-wrapper {
    animation: fly-1 0.6s ease-in-out infinite alternate;
  }

  button:hover svg {
    transform: translateX(-0.1em) rotate(30deg) scale(1.1);
  }

  button:hover {
    background-color: rgba(147, 0, 215, 0.8);
  }

  button:active {
    transform: scale(0.95);
  }

  @keyframes fly-1 {
    from {
      transform: translateY(0.05em) rotate(-5deg);
    }

    to {
      transform: translateY(-0.05em) rotate(-4deg);
    }
  }`;

export default SendButton;
