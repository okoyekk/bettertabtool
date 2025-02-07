import React, { useEffect, useState } from 'react';
import { userPreferencesToDescriptions } from '../constants';

const App: React.FC = () => {
    const [preferences, setPreferences] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'PREF_getAllPreferences' }, (response) => {
            if (response.success) {
                setPreferences(response.preferences);
            } else {
                console.error("Failed to fetch preferences: ", response.error);
            }
        });
    }, []);

    const handleToggle = (key: string) => {
        const newValue = !preferences[key];
        chrome.runtime.sendMessage({ type: 'PREF_setBooleanPreference', key, value: newValue },
            (response) => {
                if (response.success) {
                    setPreferences((prev) => ({ ...prev, [key]: newValue }));
                } else {
                    console.error("Failed to toggle preference: ", response.error);
                }
            });
    };

    return (
        <div>
            <h1>BetterTabTool</h1>
            {Object.keys(preferences).map((key: string) => (
                <div key={key}>
                    <label htmlFor={key}>{key}</label>
                    <input
                        type="checkbox"
                        id={key}
                        checked={preferences[key] || false}
                        onChange={() => handleToggle(key)}
                    />
                    <p>{userPreferencesToDescriptions[key]}</p>
                </div>
            ))}
        </div>
    );
};

export default App;