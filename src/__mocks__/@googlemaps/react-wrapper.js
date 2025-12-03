
export const Wrapper = ({ children }) => children;
export const useApi = jest.fn(() => ({
  maps: {
    Map: jest.fn(() => ({
      data: {
        addGeoJson: jest.fn(),
      },
    })),
    Data: {
      Feature: jest.fn(),
    },
  },
}));
