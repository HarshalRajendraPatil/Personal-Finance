package com.finora.app.ui.components

import java.text.DecimalFormat
import kotlin.math.abs

object CurrencyFormatter {

    fun format(amount: Double?, currencyCode: String = "INR"): String {
        if (amount == null || amount.isNaN()) return ""

        val symbol = getSymbol(currencyCode)
        val absAmount = abs(amount)
        val sign = if (amount < 0) "-" else ""

        val formattedStr: String
        val suffix: String

        when {
            absAmount >= 10_000_000 -> {
                formattedStr = DecimalFormat("#.##").format(absAmount / 10_000_000.0)
                suffix = "Cr"
            }
            absAmount >= 100_000 -> {
                formattedStr = DecimalFormat("#.##").format(absAmount / 100_000.0)
                suffix = "L"
            }
            absAmount >= 1_000 -> {
                formattedStr = DecimalFormat("#.##").format(absAmount / 1_000.0)
                suffix = "K"
            }
            else -> {
                formattedStr = DecimalFormat("#.##").format(absAmount)
                suffix = ""
            }
        }

        return "$sign$symbol$formattedStr$suffix"
    }

    fun formatFull(amount: Double?, currencyCode: String = "INR"): String {
        if (amount == null || amount.isNaN()) return ""
        val symbol = getSymbol(currencyCode)
        val formattedStr = DecimalFormat("#,##0.00").format(amount)
        return "$symbol$formattedStr"
    }

    private fun getSymbol(code: String): String {
        return when (code.uppercase()) {
            "INR" -> "₹"
            "USD" -> "$"
            "EUR" -> "€"
            "GBP" -> "£"
            else -> "$code "
        }
    }
}
