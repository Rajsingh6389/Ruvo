declare module 'react-native-image-picker' {
  export interface Asset {
    uri: string;
    fileName?: string;
    type?: string;
  }
  export interface ImagePickerResponse {
    didCancel?: boolean;
    errorCode?: string;
    errorMessage?: string;
    assets?: Asset[];
  }
  export function launchImageLibrary(options: any, callback: (response: ImagePickerResponse) => void): void;
}
