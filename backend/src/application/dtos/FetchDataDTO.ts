import { errorMessage } from '~constants/errorMessage';
import { BadRequestError } from '~errors/HttpError';

export class FetchDataDTO {
  page: number;
  limit: number;
  query: string;
  filter: string;
  sort: string;
  language: string;
  minRating?: number;

  constructor(data: {
        page: string;
        limit: string;
        query: string;
        filter: string;
        sort?: string;
        language?: string;
        minRating?: string;
    }) {
    if (!data.page || !data.limit)
      throw new BadRequestError(errorMessage.INVALID_DATA);

    this.page = parseInt(data.page.toString());
    this.limit = parseInt(data.limit.toString());
    this.query = (data.query || '').trim();
    this.filter = (data.filter || '').trim();
    this.sort = (data.sort || '').trim();
    this.language = (data.language || '').trim();
    this.minRating = data.minRating ? parseFloat(data.minRating) : undefined;
  }
}
