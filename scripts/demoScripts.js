
function generateRandomArray(sizeInput,inputValues) {
  size = +sizeInput.value;
  const minV = parseInt(sizeInput.min);
  const maxV = parseInt(sizeInput.max);
  if(size < minV) {
      size = minV;
      sizeInput.value = minV;
  }
  if(size > maxV) {
     size = maxV;
     sizeInput.value = maxV;
  }

  array = Array.from({length: size}, () => Math.floor(Math.random() * 100));
  inputValues.value = array.join(',');
}