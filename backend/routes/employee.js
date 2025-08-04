import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("get all employee details");
});

router.post("/", (req, res) => {
  res.send("add employee details");
});

router.get("/:id", (req, res) => {
  res.send("get specific employee details");
});

router.delete("/:id", (req, res) => {
  res.send("delete specific employee details");
});

router.put("/:id", (req, res) => {
  res.send("update specific employee details");
});

export default router;
