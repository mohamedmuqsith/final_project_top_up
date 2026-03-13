import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import SafeScreen from "./SafeScreen";
import { Ionicons } from "@expo/vector-icons";

interface AddressFormData {
  label: string;
  fullName: string;
  streetAddress: string;
  city: string;
  province: string;
  zipCode: string;
  phoneNumber: string;
  isDefault: boolean;
}

interface AddressFormModalProps {
  visible: boolean;
  isEditing: boolean;
  addressForm: AddressFormData;
  isAddingAddress: boolean;
  isUpdatingAddress: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: AddressFormData) => void;
}

const AddressFormModal = ({
  addressForm,
  isAddingAddress,
  isEditing,
  isUpdatingAddress,
  onClose,
  onFormChange,
  onSave,
  visible,
}: AddressFormModalProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <View className="flex-1 mt-10 rounded-t-[32px] overflow-hidden bg-background">
            <SafeScreen>
              {/* HEADER */}
              <View className="px-6 pt-4 pb-5 border-b border-surface/80 flex-row items-center justify-between bg-background">
                <View className="flex-1 pr-4">
                  <Text className="text-text-primary text-[24px] font-bold">
                    {isEditing ? "Edit Address" : "Add New Address"}
                  </Text>
                  <Text className="text-text-secondary text-sm mt-1">
                    Fill in the address details below
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  className="w-11 h-11 rounded-full bg-surface items-center justify-center"
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="px-6 py-6">
                  <View className="bg-card border border-surface/70 rounded-[28px] p-5">
                    {/* LABEL INPUT */}
                    <View className="mb-5">
                      <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                        Label
                      </Text>
                      <TextInput
                        className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base border border-transparent"
                        placeholder="e.g., Home, Work, Office"
                        placeholderTextColor="#666"
                        value={addressForm.label}
                        onChangeText={(text) => onFormChange({ ...addressForm, label: text })}
                      />
                    </View>

                    {/* NAME INPUT */}
                    <View className="mb-5">
                      <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                        Full Name
                      </Text>
                      <TextInput
                        className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base border border-transparent"
                        placeholder="Enter your full name"
                        placeholderTextColor="#666"
                        value={addressForm.fullName}
                        onChangeText={(text) => onFormChange({ ...addressForm, fullName: text })}
                      />
                    </View>

                    {/* ADDRESS INPUT */}
                    <View className="mb-5">
                      <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                        Street Address
                      </Text>
                      <TextInput
                        className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base min-h-[96px] border border-transparent"
                        placeholder="Street address, apt/suite number"
                        placeholderTextColor="#666"
                        value={addressForm.streetAddress}
                        onChangeText={(text) =>
                          onFormChange({ ...addressForm, streetAddress: text })
                        }
                        multiline
                        textAlignVertical="top"
                      />
                    </View>

                    {/* CITY INPUT */}
                    <View className="mb-5">
                      <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                        City
                      </Text>
                      <TextInput
                        className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base border border-transparent"
                        placeholder="e.g., Colombo"
                        placeholderTextColor="#666"
                        value={addressForm.city}
                        onChangeText={(text) => onFormChange({ ...addressForm, city: text })}
                      />
                    </View>

                    {/* PROVINCE + ZIP */}
                    <View className="flex-row gap-3 mb-5">
                      <View className="flex-1">
                        <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                          Province
                        </Text>
                        <TextInput
                          className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base border border-transparent"
                          placeholder="e.g., Western Province"
                          placeholderTextColor="#666"
                          value={addressForm.province}
                          onChangeText={(text) =>
                            onFormChange({ ...addressForm, province: text })
                          }
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                          ZIP Code
                        </Text>
                        <TextInput
                          className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base border border-transparent"
                          placeholder="e.g., 10001"
                          placeholderTextColor="#666"
                          value={addressForm.zipCode}
                          onChangeText={(text) =>
                            onFormChange({ ...addressForm, zipCode: text })
                          }
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* PHONE INPUT */}
                    <View className="mb-5">
                      <Text className="text-text-primary font-semibold mb-2.5 text-[15px]">
                        Phone Number
                      </Text>
                      <TextInput
                        className="bg-surface text-text-primary px-4 py-4 rounded-2xl text-base border border-transparent"
                        placeholder="e.g., 077 123 4567"
                        placeholderTextColor="#666"
                        value={addressForm.phoneNumber}
                        onChangeText={(text) =>
                          onFormChange({ ...addressForm, phoneNumber: text })
                        }
                        keyboardType="phone-pad"
                      />
                    </View>

                    {/* DEFAULT ADDRESS TOGGLE */}
                    <View className="bg-surface rounded-2xl px-4 py-4 flex-row items-center justify-between mb-2">
                      <View className="flex-1 pr-4">
                        <Text className="text-text-primary font-semibold text-[15px]">
                          Set as default address
                        </Text>
                        <Text className="text-text-secondary text-sm mt-1">
                          Use this as your primary delivery address
                        </Text>
                      </View>

                      <Switch
                        value={addressForm.isDefault}
                        onValueChange={(value) =>
                          onFormChange({ ...addressForm, isDefault: value })
                        }
                        thumbColor="white"
                      />
                    </View>
                  </View>

                  {/* SAVE BUTTON */}
                  <TouchableOpacity
                    className="bg-primary rounded-2xl py-5 items-center mt-6 shadow-sm"
                    activeOpacity={0.8}
                    onPress={onSave}
                    disabled={isAddingAddress || isUpdatingAddress}
                  >
                    {isAddingAddress || isUpdatingAddress ? (
                      <ActivityIndicator size="small" color="#121212" />
                    ) : (
                      <Text className="text-background font-bold text-lg">
                        {isEditing ? "Save Changes" : "Add Address"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeScreen>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddressFormModal;