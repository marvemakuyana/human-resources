import { useState } from "react";

import {
  Button,
  CloseButton,
  Dialog,
  Input,
  Portal,
  VStack,
} from "@chakra-ui/react";
import { toast } from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { Field } from "./field";
import SelectRole from "./SelectRole";
import { baseUrl } from "../../../constant/global-variable";
import { queryClient } from "../../../utils/queryClient";

const InputEmployee = ({ children, type = "add", data }) => {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(
    type === "add"
      ? {
          name: "",
          email: "",
          age: "",
          salary: "",
          role: "",
        }
      : data
  );
  const requiredFields = ["name", "age", "salary", "email"];
  const addEmployeeMutation = useMutation({
    mutationFn: async (info) => {
      const response = await fetch(baseUrl, {
        method: "POST",
        body: JSON.stringify(info),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data;
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      setInfo({ name: "", email: "", age: "", salary: "", role: "" });
      setOpen(false);
      toast.success("Employee details added!");
      queryClient.invalidateQueries({ queryKey: ["employee_details"] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (info) => {
      const response = await fetch(baseUrl + "/" + info.id, {
        method: "PUT",
        body: JSON.stringify(info),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data;
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      setInfo({ name: "", email: "", age: "", salary: "", role: "" });
      setOpen(false);
      toast.success("Employee details updated!");
      queryClient.invalidateQueries({ queryKey: ["employee_details"] });
    },
  });

  function handleChange(e) {
    setInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit() {
    for (const key of requiredFields) {
      if (!info[key].toString().trim()) {
        toast.error("Missing Fields");
        return;
      }
    }
    const infoUpdated = { ...info, role: info.role || null };
    if (type === "add") {
      addEmployeeMutation.mutate(infoUpdated);
    } else {
      updateEmployeeMutation.mutate(infoUpdated);
    }
  }

  return (
    <Dialog.Root
      placement="center"
      motionPreset="slide-in-bottom"
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
    >
      {children}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {type === "add" ? "Add Employee" : "Update Employee"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap="4" alignItems="flex-start">
                <Field label="Full Name" required>
                  <Input
                    name="name"
                    placeholder="Enter employee fullname"
                    value={info.name}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Email" required>
                  <Input
                    name="email"
                    placeholder="Enter employee email"
                    value={info.email}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Age" required>
                  <Input
                    name="age"
                    placeholder="Enter employee age"
                    type="number"
                    value={info.age}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Salary" required>
                  <Input
                    name="salary"
                    placeholder="Enter employee salary"
                    value={info.salary}
                    onChange={handleChange}
                  />
                </Field>
                <SelectRole setInfo={setInfo} />
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button onClick={handleSubmit}>
                {type === "add" ? "Add" : "Update"}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default InputEmployee;
