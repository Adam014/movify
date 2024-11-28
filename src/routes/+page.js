import { supabase } from '../lib/db/supabaseClient';
import { getAllMovies, TMDB_API_KEY } from '../lib/utils';

export async function load({ fetch, url }) {
	const page = parseInt(url.searchParams.get('page')) || 1;

	try {
		// Fetch total movies count from Supabase
		const { count, error: countError } = await supabase
			.from('films')
			.select('*', { count: 'exact', head: true });

			if (countError || count === 0) {
				console.warn('Count query failed or returned zero. Falling back to estimate.');
				return {
					data: { results: films },
					count: 0,
					currentPage: page,
				};
			}

		let films = await getAllMovies(page);

		if (films && films.length > 0) {
			return {
				data: { results: films },
				count, 
				currentPage: page 
			};
		}

		// If not found in Supabase, fetch from TMDB API
		const apiUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
		const res = await fetch(apiUrl);

		if (res.ok) {
			const data = await res.json();

			// Insert fetched data into Supabase
			const filmsToInsert = data.results.map((movie) => ({
				id: movie.id,
				adult: movie.adult,
				backdrop_path: movie.backdrop_path,
				genre_ids: movie.genre_ids,
				original_language: movie.original_language,
				original_title: movie.original_title,
				popularity: movie.popularity,
				poster_path: movie.poster_path,
				release_date: movie.release_date,
				title: movie.title,
				video: movie.video,
				vote_average: movie.vote_average,
				vote_count: movie.vote_count,
				page: page
			}));

			const { error: insertError } = await supabase.from('films').upsert(filmsToInsert);

			if (insertError) {
				console.error('Error inserting into Supabase:', insertError);
			}

			return {
				data,
				count,
				currentPage: page
			};
		} else {
			return {
				data: { results: [] },
				count,
				currentPage: page,
				error: 'No results for this page.',
			};
		}
	} catch (error) {
		console.error('Error during data fetching process:', error);
		return {
			data: null,
			count: 0,
			currentPage: page,
			error: 'Failed to load data'
		};
	}
}
