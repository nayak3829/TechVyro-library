CREATE OR REPLACE FUNCTION get_analytics_trends(p_days INTEGER DEFAULT 7)
RETURNS TABLE(event_date DATE, views BIGINT, downloads BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH days AS (
    SELECT generate_series(
      CURRENT_DATE - (LEAST(GREATEST(COALESCE(p_days, 7), 1), 90) - 1),
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE AS event_date
  ),
  counts AS (
    SELECT
      (created_at AT TIME ZONE 'UTC')::DATE AS event_date,
      COUNT(*) FILTER (WHERE event_type = 'view') AS views,
      COUNT(*) FILTER (WHERE event_type = 'download') AS downloads
    FROM analytics_events
    WHERE created_at >= (CURRENT_DATE - (LEAST(GREATEST(COALESCE(p_days, 7), 1), 90) - 1))::TIMESTAMP AT TIME ZONE 'UTC'
    GROUP BY (created_at AT TIME ZONE 'UTC')::DATE
  )
  SELECT days.event_date, COALESCE(counts.views, 0), COALESCE(counts.downloads, 0)
  FROM days
  LEFT JOIN counts USING (event_date)
  ORDER BY days.event_date;
$$;

REVOKE ALL ON FUNCTION get_analytics_trends(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_trends(INTEGER) TO service_role;