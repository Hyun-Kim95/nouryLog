import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation';
import { getAccessToken } from './src/authStorage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialLoggedIn, setInitialLoggedIn] = useState(false);

  useEffect(() => {
    void getAccessToken().then((t) => {
      setInitialLoggedIn(!!t);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <RootNavigator initialLoggedIn={initialLoggedIn} />
    </NavigationContainer>
  );
}
