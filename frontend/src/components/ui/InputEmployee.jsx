import { useState } from "react";

import {
  Button,
  CloseButton,
  Dialog,
  Input,
  Portal,
  VStack,
} from "@chakra-ui/react";
import { Field } from "./field";
import SelectRole from "./SelectRole";

const InputEmployee = () => {
  const [info, setInfo] = useState({
    name: "",
    email: "",
    age: "",
    salary: "",
    role: "",
  });
  function handleChange(e) {
    setInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }
  console.log(info);

  return (
    <Dialog.Root placement="center" motionPreset="slide-in-bottom">
      <Dialog.Trigger asChild>
        <Button variant="outline">Add Employee </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Add Employee</Dialog.Title>
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
              <Button>Save</Button>
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
