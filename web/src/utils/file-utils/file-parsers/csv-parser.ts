import Papa from 'papaparse';

export const parseCSVFile = <T extends Record<string, string | number | boolean>>(
  file: File,
): Promise<Papa.ParseResult<T>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target && event.target.result) {
        const csvData = Papa.parse<T>(event.target.result as string, {
          header: true,
          skipEmptyLines: true,
        });

        if (csvData.errors.length > 0) {
          reject(new Error('Error parsing CSV file. Please check the format.'));
        } else {
          resolve(csvData as Papa.ParseResult<T>);
        }
      } else {
        reject(new Error('File read error'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File read error'));
    };

    reader.readAsText(file);
  });
};
