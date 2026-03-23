
/**
 * Verification script for address mapping logic
 */
const mockReqBody = {
  fullName: "John Doe",
  streetAddress: "123 Main St",
  city: "Colombo",
  district: "Colombo",
  province: "Western",
  zipCode: "10115",
  phoneNumber: "0771234567"
};

const handleAddressMapping = (body) => {
  const { district, province, postalCode, zipCode } = body;
  const finalPostalCode = postalCode || zipCode;
  
  const result = {
    district,
    province,
    postalCode: finalPostalCode
  };
  
  return result;
};

const result = handleAddressMapping(mockReqBody);
console.log("Input ZipCode:", mockReqBody.zipCode);
console.log("Output District:", result.district);
console.log("Output PostalCode:", result.postalCode);

if (result.district === "Colombo" && result.postalCode === "10115") {
  console.log("PASS: Mapping works correctly.");
} else {
  console.log("FAIL: Mapping failed.");
}
