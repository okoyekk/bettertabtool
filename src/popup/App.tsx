import React, { useEffect, useState } from 'react';
import { userPreferencesToDescriptions, ThemeMode } from '../constants';
import { preferenceCompareFn, getEffectiveTheme, onSystemThemeChange, detectSystemTheme } from '../utils';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';

const App: React.FC = () => {
    const [preferences, setPreferences] = useState<{ [key: string]: any }>({});
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(detectSystemTheme());

    const effectiveTheme = getEffectiveTheme((preferences['themeMode'] as ThemeMode) || 'auto', systemTheme);

    const theme = createTheme({
        typography: {
            fontSize: 13,
            fontFamily: [
                '-apple-system',
                'BlinkMacSystemFont',
                '"Segoe UI"',
                'Roboto',
                '"Helvetica Neue"',
                'Arial',
                'sans-serif',
            ].join(','),
            h6: {
                fontWeight: 700,
                letterSpacing: '-0.5px',
            },
        },
        palette: {
            mode: effectiveTheme,
            background: {
                default: effectiveTheme === 'dark' ? '#121212' : '#ffffff',
                paper: effectiveTheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
            },
        },
        shape: {
            borderRadius: 12,
        },
        components: {
            MuiListItem: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        marginBottom: 8,
                        backgroundColor: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#fff',
                        boxShadow: effectiveTheme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                        border: `1px solid ${effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)'}`,
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 500,
                    },
                },
            },
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
            <Box
                id="top"
                data-testid="app-root"
                data-theme={effectiveTheme}
                sx={{ p: 2, bgcolor: 'background.default' }}
            >
                <Box sx={{ mb: 2, pl: 1 }}>
                    <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
                        BetterTabTool
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Enhance your tab management
                    </Typography>
                </Box>

                <List sx={{ width: '100%' }}>
                    {Object.keys(userPreferencesToDescriptions) // Iterate through descriptions for consistent order
                        .sort(preferenceCompareFn)
                        .map((key: string) => (
                            <ListItem key={key} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                                <ListItemText
                                    primary={
                                        <Typography
                                            sx={{
                                                fontWeight: 500,
                                            }}
                                            variant="body2"
                                            color="text.primary"
                                        >
                                            {userPreferencesToDescriptions[key].description}
                                        </Typography>
                                    }
                                />
                                {key === 'themeMode' ? (
                                    <ToggleButtonGroup
                                        value={preferences[key] || 'auto'}
                                        exclusive
                                        onChange={(event, newValue) => {
                                            if (newValue !== null) {
                                                handlePreferenceChange(key, newValue as ThemeMode);
                                            }
                                        }}
                                        aria-label="theme-mode"
                                        size="small"
                                        sx={{ height: 32 }}
                                    >
                                        <ToggleButton value="light" aria-label="light" sx={{ px: 2 }}>
                                            Light
                                        </ToggleButton>
                                        <ToggleButton value="dark" aria-label="dark" sx={{ px: 2 }}>
                                            Dark
                                        </ToggleButton>
                                        <ToggleButton value="auto" aria-label="auto" sx={{ px: 2 }}>
                                            Auto
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                ) : (
                                    <Checkbox
                                        edge="end"
                                        id={`${key}-toggle`}
                                        checked={preferences[key] || false}
                                        onChange={() => handlePreferenceChange(key, !preferences[key])}
                                        size="small"
                                    />
                                )}
                            </ListItem>
                        ))}
                </List>
            </Box>
        </ThemeProvider>
    );
};

export default App;
