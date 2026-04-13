// This screen is never rendered — the tab button is replaced by the FAB
// It exists only so expo-router registers the route for the tab bar layout.
import { View } from 'react-native';
export default function CreatePlaceholder() { return <View />; }
