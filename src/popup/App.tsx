import React, { useEffect, useState } from 'react';
import { userPreferencesToDescriptions } from '../constants';
import { preferenceCompareFn } from '../utils';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';

const App: React.FC = () => {
    const [preferences, setPreferences] = useState<{ [key: string]: boolean }>({});
    const theme = createTheme({
        typography: {
            fontSize: 12,
        },
        palette: {
            mode: preferences['darkMode'] ? 'dark' : 'light',
        },
    });

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'PREF_getAllPreferences' }, (response) => {
            if (response.success) {
                setPreferences(response.preferences);
            } else {
                console.error('Failed to fetch preferences: ', response.error);
            }
        });
    }, []);

    const handleToggle = (key: string) => {
        const newValue = !preferences[key];
        chrome.runtime.sendMessage({ type: 'PREF_setBooleanPreference', key, value: newValue }, (response) => {
            if (response.success) {
                setPreferences((prev) => ({ ...prev, [key]: newValue }));
            } else {
                console.error('Failed to toggle preference: ', response.error);
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
                    {Object.keys(preferences)
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
                                                {userPreferencesToDescriptions[key]}
                                            </Typography>
                                        }
                                    />
                                    <Checkbox
                                        id={`${key}-toggle`}
                                        checked={preferences[key] || false}
                                        onChange={() => handleToggle(key)}
                                    />
                                </ListItem>
                                {key !=
                                    Object.keys(userPreferencesToDescriptions)[
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
