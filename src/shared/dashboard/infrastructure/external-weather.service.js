import { http } from '../../infrastructure/http/api-client.js';

export class ExternalWeatherService {
    async getCurrentWeather(latitude = -12.0464, longitude = -77.0428) {
        const response = await http.get('/external/weather/current', {
            params: {
                latitude,
                longitude
            }
        });

        return response.data;
    }
}
