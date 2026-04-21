export interface CreateGymActionState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: {
    name?: string;
  };
}

export const initialCreateGymActionState: CreateGymActionState = {
  status: "idle",
};
