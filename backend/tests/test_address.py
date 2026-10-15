import unittest

from app.address import normalize_address


class NormalizeAddressTests(unittest.TestCase):
    def test_trims_and_collapses_whitespace(self) -> None:
        self.assertEqual(
            normalize_address("  Via   Roma\t12  "),
            "Via Roma 12",
        )

    def test_standardizes_comma_spacing(self) -> None:
        self.assertEqual(
            normalize_address("Via Roma ,12,  Milano"),
            "Via Roma, 12, Milano",
        )

    def test_collapses_repeated_commas(self) -> None:
        self.assertEqual(
            normalize_address("Via Roma, ,,, 12"),
            "Via Roma, 12",
        )

    def test_preserves_case_and_abbreviations(self) -> None:
        self.assertEqual(
            normalize_address("V.  Roma,  S.r.l."),
            "V. Roma, S.r.l.",
        )

    def test_normalization_is_idempotent(self) -> None:
        address = "Via Roma ,12,,  Milano"
        normalized = normalize_address(address)
        self.assertEqual(normalize_address(normalized), normalized)


if __name__ == "__main__":
    unittest.main()
