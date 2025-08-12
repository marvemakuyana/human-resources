import { VStack } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import EmployeeTable from "./components/ui/EmployeeTable";
import { baseUrl } from "../constant/global-variable";

const App = () => {
  async function fetchEmployeeDetails() {
    const res = await fetch(baseUrl);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    }
    return data;
  }
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["employee_details"],
    queryFn: fetchEmployeeDetails,
  });

  if (isPending) return "Loading...";

  if (isError) return error.message;

  return (
    <VStack gap="6" align="flex-start">
      <EmployeeTable data={data} />
    </VStack>
  );
};

export default App;
