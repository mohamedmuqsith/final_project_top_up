import { useAuth ,useUser} from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'

export default function AuthRoutesLayout() {
  const { isSignedIn ,userId} = useAuth()
  console.log(isSignedIn,userId);
  

  // if (!isLoaded) {
  //   return null
  // }

  // if (isSignedIn) {
  //   return <Redirect href={'/'} />
  // }

  return <Stack screenOptions={{headerShown:false}}/>
}