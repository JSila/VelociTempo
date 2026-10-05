/// Parses a Jira duration ("1h 30m", "2h", "0.5d", "1w 2d") into seconds, using Jira's defaults of
/// 8 hours per day and 5 days per week. Returns `None` for anything else or a non-positive total.
pub fn parse_seconds(value: &str) -> Option<u64> {
    let mut total = 0.0;
    let mut parts = 0;
    for part in value.split_whitespace() {
        let unit = part.chars().last()?;
        let factor = match unit.to_ascii_lowercase() {
            'w' => 5.0 * 8.0 * 3600.0,
            'd' => 8.0 * 3600.0,
            'h' => 3600.0,
            'm' => 60.0,
            _ => return None,
        };
        let number: f64 = part[..part.len() - 1].parse().ok()?;
        if !number.is_finite() || number < 0.0 {
            return None;
        }
        total += number * factor;
        parts += 1;
    }
    let seconds = total.round();
    (parts > 0 && seconds > 0.0).then_some(seconds as u64)
}

#[cfg(test)]
mod tests {
    use super::parse_seconds;

    #[test]
    fn parses_jira_durations() {
        assert_eq!(parse_seconds("1h 30m"), Some(5400));
        assert_eq!(parse_seconds("2h"), Some(7200));
        assert_eq!(parse_seconds("45m"), Some(2700));
        assert_eq!(parse_seconds("0.5d"), Some(4 * 3600));
        assert_eq!(parse_seconds("1w"), Some(40 * 3600));
    }

    #[test]
    fn rejects_invalid() {
        for value in ["", "1.5", "abc", "1x", "0h", "-1h", "h"] {
            assert_eq!(parse_seconds(value), None, "{value:?}");
        }
    }
}
