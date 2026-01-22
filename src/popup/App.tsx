import React, { useEffect, useState } from 'react';
import { userPreferencesToDescriptions, ThemeMode } from '../constants';
import { preferenceCompareFn, getEffectiveTheme, onSystemThemeChange, detectSystemTheme } from '../utils';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

const App: React.FC = () => {
    const [preferences, setPreferences] = useState<{ [key: string]: any }>({});
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(detectSystemTheme());

    const theme = createTheme({
        typography: {
            fontSize: 12,
        },
        palette: {
            mode: getEffectiveTheme((preferences['themeMode'] as ThemeMode) || 'auto'),
        },
    });

    useEffect(() => {
        const fetchPreferences = async () => {
            chrome.runtime.sendMessage({ type: 'PREF_getAllPreferences' }, (response) => {
                if (response.success) {
                    setPreferences(response.preferences);
                } else {
                    console.error('Failed to fetch preferences: ', response.error);
                }
            });
        };

        fetchPreferences();

        const handleSystemThemeChange = (theme: 'light' | 'dark') => {
            setSystemTheme(theme);
        };

        onSystemThemeChange(handleSystemThemeChange);

        return () => {};
    }, []);

    const handlePreferenceChange = (key: string, value: any) => {
        chrome.runtime.sendMessage({ type: 'PREF_setPreference', key, value }, (response) => {
            if (response.success) {
                setPreferences((prev) => ({ ...prev, [key]: value }));
            } else {
                console.error('Failed to set preference: ', response.error);
            }
        });
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div id="top">
                <Typography variant="h4" sx={{ pt: 2, pl: 2, pr: 2 }}>
                    BetterTabTool
                </Typography>
                <Typography variant="h5" sx={{ pl: 2, pr: 2 }}>
                    Enhance your tab management
                </Typography>
                <Divider />
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                    {Object.keys(userPreferencesToDescriptions) // Iterate through descriptions for consistent order
                        .sort(preferenceCompareFn)
                        .map((key: string) => (
                            <React.Fragment key={key}>
                                <ListItem alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Typography
                                                sx={{
                                                    color: 'text.primary',
                                                    display: 'block',
                                                }}
                                                component="p"
                                                variant="body1"
                                            >
                                                {key}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography
                                                sx={{
                                                    color: 'text.primary',
                                                    display: 'inline',
                                                }}
                                                component="span"
                                                variant="body2"
                                            >
                                                {userPreferencesToDescriptions[key].description}
                                            </Typography>
                                        }
                                    />
                                    {key === 'themeMode' ? (
                                        <RadioGroup
                                            aria-label="theme-mode"
                                            name="theme-mode-group"
                                            value={preferences[key] || 'auto'}
                                            onChange={(event) =>
                                                handlePreferenceChange(key, event.target.value as ThemeMode)
                                            }
                                        >
                                            <FormControlLabel value="light" control={<Radio />} label="Light" />
                                            <FormControlLabel value="dark" control={<Radio />} label="Dark" />
                                            <FormControlLabel
                                                value="auto"
                                                control={<Radio />}
                                                label={`Auto${preferences['themeMode'] === 'auto' ? ` (${systemTheme})` : ''}`}
                                            />
                                        </RadioGroup>
                                    ) : (
                                        <Checkbox
                                            id={`${key}-toggle`}
                                            checked={preferences[key] || false}
                                            onChange={() => handlePreferenceChange(key, !preferences[key])}
                                        />
                                    )}
                                </ListItem>
                                {key !=
                                    Object.keys(userPreferencesToDescriptions).sort(preferenceCompareFn)[
                                        Object.keys(userPreferencesToDescriptions).length - 1
                                    ] && <Divider component="li" />}
                            </React.Fragment>
                        ))}
                </List>
            </div>
        </ThemeProvider>
    );
};

export default App;
