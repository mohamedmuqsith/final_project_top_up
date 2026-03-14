import useSocialAuth from "@/hooks/useSocialAuth";
import SafeScreen from "@/components/SafeScreen";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeIn, ZoomIn } from "react-native-reanimated";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

const AuthScreen = () => {
  const { loadingStrategy, handleSocialAuth } = useSocialAuth();

  return (
    <SafeScreen>
      <View className="flex-1">
        {/* BACKGROUND DECORATIVE ELEMENTS */}
        <View className="absolute top-[-50] left-[-50] size-64 bg-primary/10 rounded-full blur-[100px]" />
        <View className="absolute bottom-[100] right-[-100] size-96 bg-primary/5 rounded-full blur-[120px]" />

        <View className="flex-1 px-8 pt-10">
          {/* HEADER SECTION */}
          <Animated.View 
            entering={FadeInUp.duration(800).delay(200)}
            className="items-center mb-10"
          >
            <View className="size-20 bg-primary/15 rounded-[30px] items-center justify-center mb-5 border border-primary/20 shadow-xl shadow-primary/20">
              <Ionicons name="flash" size={40} color="#4FD1C5" />
            </View>
            <Text className="text-text-primary text-5xl font-black tracking-tighter text-center">
              Smart<Text className="text-primary">Shop</Text>
            </Text>
            <View className="h-1 w-12 bg-primary/40 rounded-full mt-2" />
            <Text className="text-text-secondary text-base mt-2 font-medium text-center">
              Intelligence in every gadget
            </Text>
          </Animated.View>

          {/* CENTRAL ILLUSTRATION */}
          <Animated.View 
            entering={ZoomIn.duration(1000).springify()}
            className="items-center justify-center flex-1 mb-8"
          >
            <View className="absolute size-64 border border-primary/5 rounded-full" />
            <View className="absolute size-48 border border-primary/10 rounded-full" />
            <Image
              source={require("../../assets/images/auth-image.png")}
              className="size-72"
              resizeMode="contain"
            />
          </Animated.View>

          {/* AUTH OPTIONS CARD */}
          <Animated.View 
            entering={FadeInUp.duration(800).delay(500)}
            className="w-full mb-10 overflow-hidden rounded-[32px] border border-white/5 shadow-2xl"
          >
            <BlurView intensity={20} tint="dark" className="p-6">
              <Text className="text-text-primary text-lg font-bold mb-5 ml-1">
                Unlock the Future
              </Text>

              <View className="gap-4">
                {/* GOOGLE SIGN IN */}
                <TouchableOpacity
                  className="flex-row items-center bg-white h-16 rounded-2xl px-6"
                  onPress={() => handleSocialAuth("oauth_google")}
                  disabled={loadingStrategy !== null}
                  activeOpacity={0.9}
                >
                  {loadingStrategy === "oauth_google" ? (
                    <ActivityIndicator className="flex-1" size="small" color="#121212" />
                  ) : (
                    <>
                      <Image
                        source={require("../../assets/images/google.png")}
                        className="size-8 mr-4"
                        resizeMode="contain"
                      />
                      <Text className="text-background font-bold text-lg flex-1">
                        Continue with Google
                      </Text>
                      <Ionicons name="arrow-forward-circle" size={24} color="#121212" />
                    </>
                  )}
                </TouchableOpacity>

                {/* APPLE SIGN IN */}
                <TouchableOpacity
                  className="flex-row items-center bg-surface-light h-16 rounded-2xl px-6 border border-white/5"
                  onPress={() => handleSocialAuth("oauth_apple")}
                  disabled={loadingStrategy !== null}
                  activeOpacity={0.9}
                >
                  {loadingStrategy === "oauth_apple" ? (
                    <ActivityIndicator className="flex-1" size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Image
                        source={require("../../assets/images/apple.png")}
                        className="size-7 mr-4"
                        resizeMode="contain"
                        style={{ tintColor: "#FFFFFF" }}
                      />
                      <Text className="text-text-primary font-bold text-lg flex-1">
                        Continue with Apple
                      </Text>
                      <Ionicons name="logo-apple" size={20} color="#6A6A6A" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

          {/* LEGAL FOOTER */}
          <Animated.View 
            entering={FadeIn.duration(1000).delay(800)}
            className="pb-10"
          >
            <Text className="text-center text-text-tertiary text-[11px] leading-5 font-medium">
              By entering SmartShop, you agree to our{" "}
              <Text className="text-primary/80 underline font-bold">Terms</Text>{" "}
              and acknowledge our{" "}
              <Text className="text-primary/80 underline font-bold">Privacy</Text>.
            </Text>
          </Animated.View>
        </View>
      </View>
    </SafeScreen>
  );
};

export default AuthScreen;