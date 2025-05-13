export function useToast() {
  return {
    toast: (msg: any) => alert(typeof msg === 'string' ? msg : JSON.stringify(msg)),
  };
} 