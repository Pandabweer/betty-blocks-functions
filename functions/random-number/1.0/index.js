const Generate_random_number = async ({ min, max }) => {
  const mini = Math.ceil(min);
  const maxi = Math.floor(max);
  const randomNumber = Math.floor(Math.random() * (maxi - mini + 1)) + mini;
  return {
    returning: randomNumber,
  };
};

export default Generate_random_number;