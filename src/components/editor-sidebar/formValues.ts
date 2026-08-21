import type { LatLng, Story } from '../../db';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../lib/mapDefaults';

export interface FormValues {
  name: string;
  tileUrlValue: string;
  tileLayerAuthor: string;
  tileLayerAttributionUrl: string;
  initialCenter: LatLng;
  initialZoom: number;
}

export function storyToFormValues(story: Story | null): FormValues {
  return {
    name: story?.name ?? '',
    tileUrlValue: story?.tileUrlTemplate ?? '',
    tileLayerAuthor: story?.tileLayerAuthor ?? '',
    tileLayerAttributionUrl: story?.tileLayerAttributionUrl ?? '',
    initialCenter: story?.initialCenter ?? DEFAULT_CENTER,
    initialZoom: story?.initialZoom ?? DEFAULT_ZOOM,
  };
}
