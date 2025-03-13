import { useOnboarding } from '../../context/OnboardingProvider';
import './OnboardingSettingsToggle.css';

const OnboardingSettingsToggle = () => {
  const { showTooltips, toggleShowTooltips, restartOnboarding } = useOnboarding();

  return (
    <div className="onboarding-settings">
      <div className="toggle-item">
        <div className="toggle-text">
          <h3>Show onboarding tooltips</h3>
          <p>Display helpful tooltips when hovering over features</p>
        </div>
        <label className="switch">
          <input 
            type="checkbox" 
            checked={showTooltips} 
            onChange={toggleShowTooltips}
          />
          <span className="slider"></span>
        </label>
      </div>
      <button className="restart-onboarding-btn" onClick={restartOnboarding}>
        Restart Onboarding
      </button>
    </div>
  );
};

export default OnboardingSettingsToggle;