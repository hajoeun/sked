import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
  // Add other fields as needed
}

/**
 * URL 메타데이터 추출 로직을 캡슐화하는 서비스 클래스
 * [SOLID: Single Responsibility] 메타데이터 추출 책임
 * [Pattern: Service Class] 관련 로직을 클래스로 묶어 관리
 */
export class PreviewService {

  // 생성자에서 필요하다면 axios 인스턴스나 설정을 주입받을 수 있음
  // constructor(private httpClient: AxiosInstance) {}

  /**
   * Fetches OpenGraph metadata from a URL.
   * @param url The URL to fetch metadata from.
   * @returns The extracted metadata object.
   * @throws If an error occurs during fetching or parsing.
   */
  async fetchMetadata(url: string): Promise<Metadata> {
    if (!url || typeof url !== 'string') {
      throw new Error('Valid URL is required');
    }

    try {
      // Set a user-agent to mimic a browser, as some sites block default agents
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SkedPreviewBot/1.0; +https://sked.hajoeun.com)', // Modify as appropriate
          'Accept': 'text/html',
        },
        timeout: 5000, // 5-second timeout
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to fetch URL: Status code ${response.status}`);
      }

      const html = response.data;
      const $ = cheerio.load(html);

      const getMetatag = (name: string): string | undefined => {
        // Prioritize OpenGraph tags
        return $(`meta[property="og:${name}"]`).attr('content') || $(`meta[name="${name}"]`).attr('content');
      };

      const metadata: Metadata = {
        title: getMetatag('title') || $('title').first().text() || undefined,
        description: getMetatag('description'),
        image: getMetatag('image'),
        url: getMetatag('url') || url,
        siteName: getMetatag('site_name'),
        type: getMetatag('type'),
      };

      // Infer siteName from URL if og:site_name is missing
      if (!metadata.siteName && metadata.url) {
        try {
          metadata.siteName = new URL(metadata.url).hostname.replace(/^www\./, '');
        } catch (e) { /* Ignore URL parsing errors */ }
      }

      // Optional: Clean up or validate data further
      // e.g., Ensure image URL is absolute
      if (metadata.image && metadata.url && !metadata.image.startsWith('http')) {
         try {
             const baseUrl = new URL(metadata.url);
             metadata.image = new URL(metadata.image, baseUrl).toString();
         } catch (e) { /* Ignore URL parsing errors */ }
      }

      return metadata;

    } catch (error) {
      console.error(`[PreviewService] Error fetching metadata for ${url}:`, error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error while fetching metadata: ${error.message}`);
      }
      throw new Error(`Failed to process metadata for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 