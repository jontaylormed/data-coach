# Data Coach

Students make a data set, organize it, draw every display that fits, find its center and spread, and fit a normal curve.

**Live site:** <https://jontaylormed.github.io/data-coach/>

**Source:** <https://github.com/jontaylormed/data-coach>

**Site created by Claude and Jon Taylor.**

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

---

## What it does

| Section | What the student does |
|---|---|
| Data Lab | Picks a data set (coin flips, dice, heights, screen time, rainfall and more), chooses how many values, and makes new data any time |
| Tally It / Build the Table | Tallies the data and builds a frequency table |
| Draw a Display | Draws a bar graph, pie chart, dot plot, histogram, stem-and-leaf plot, box plot or line graph, or fits a normal curve over a histogram |
| Measures (Guess First) | Guesses the center and spread, then finds them: mean, median, mode, range, IQR, MAD, both standard deviations and the shape |
| Quiz Me | Answers questions about the data set they just made |
| Learn It | Works through eight levels: kinds of data, organizing, center, showing categories, showing numbers, spread, change over time, and shape and the normal curve |
| Common Mistakes | For each of 18 common mistakes, picks the right answer from choices that include that mistake; a wrong choice names the mistake |

Sometimes the Lab draws a display that doesn't fit the data and asks what is wrong with it.

## Who it's for

Grades 6–12. Levels 1–6 cover Grade 6 statistics, Level 7 (graphs over time) runs through Grade 8, and Level 8 (shape, standard deviation and the normal curve) is high school.

Common Core State Standards for Mathematics:

| Standard | What it asks |
|---|---|
| 6.SP.A.1 | Recognize a statistical question: one that expects variability in the answers |
| 6.SP.A.3 | Recognize that a measure of center, and a measure of variation, each sum up a data set with one number |
| 6.SP.B.4 | Display numerical data in dot plots, histograms and box plots |
| 6.SP.B.5c | Give measures of center (median, mean) and variability (interquartile range, mean absolute deviation) |
| 8.SP.A.1 | Investigate patterns in data (Level 7 reads trends in data graphed over time) |
| HSS.ID.A.1 | Represent data with dot plots, histograms and box plots |
| HSS.ID.A.2 | Compare center and spread, including standard deviation |
| HSS.ID.A.3 | Interpret differences in shape, center and spread, including the effect of outliers |
| HSS.ID.A.4 | Use the mean and standard deviation to fit a normal distribution and estimate percentages |

Bar graphs and pie charts are also taught, but they have no Common Core code of their own at these grades.

## How it teaches

- **See it first.** The Lab comes first: students make data, then draw it, before the lessons name the ideas.
- **Structure before numbers.** Students decide which displays and which measures fit a kind of data, and say what is wrong with a display that doesn't fit.
- **Guess, then check.** In the Lab, each measure is guessed before it is found.
- **A right answer is never called wrong.**

## How the math was checked

- **Test page:** [`tests.html`](https://jontaylormed.github.io/data-coach/tests.html) runs 74 tests in the browser and checks 2,070 random data sets against reference calculations. The tests cover statistical questions, which display and which measures fit, stem-and-leaf plots, pie fractions, mode, quartiles, standard deviation, shape, the 68–95–99.7 rule, readings from graphs, trends, the Lab's tally, typed answers, every common mistake and the worked examples. All pass.
- **Build checks:** `build.ps1` fails if the tool would make a network request or store data, if any of 22 color pairs is below its contrast target, if a button or heading is not in Title Case, or if any JavaScript file has a syntax error.
- **Known limits:** quartiles leave the median out of both halves when the count is odd. Textbooks use more than one method, and others can give slightly different quartiles. Outliers use the 1.5 × IQR rule. Each standard deviation question names which one it wants: σ for a whole population (divide by n) or s for a sample (divide by n − 1).
- **All data is made up** by the tool. None of it is real people's data.

## Accessibility

- Every control is a standard button, link or form field, or a slider with a keyboard handle, so it works with the keyboard. Focus outlines are visible, and scrolling tables can be reached by keyboard.
- Feedback is announced to screen readers through live regions.
- All text meets WCAG 2.1 AA contrast, checked at every build.
- The few animations (coin flips, dice, spinners) turn off when the device asks for reduced motion.
- The layout works at phone width (375 px) and with browser zoom. There is no separate text-size setting.

## Privacy

No accounts, no tracking, no cookies and no stored data. The tool makes no network requests, and the build fails if one is added. Everything resets when the tab closes.

## Running it

Open `index.html` in any modern browser. Open `tests.html` to run the tests.

To rebuild after changing anything in `src/`, run this in Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File build.ps1
```

**Publishing:** GitHub Pages, deployed from the `main` branch at the repository root. `index.html` is committed already built, so GitHub needs no build step.

You can send students to one spot by adding to the link: `#level=3`, `#level=3&start=practice`, `#level=3&start=check`, `#start=mistakes&level=3` or `#start=menu`.

## License

[CC BY-NC-SA 4.0](LICENSE). Free to share and adapt for non-commercial use, with credit, under the same license.
