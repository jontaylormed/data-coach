# Data Coach

Students make a data set, organize it, draw every display that fits, and find its center and spread.

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
| Draw a Display | Draws a bar graph, pie chart, dot plot, histogram, stem-and-leaf plot, box plot or line graph |
| Measures (Guess First) | Guesses the center and spread, then finds them |
| Quiz Me | Answers questions about the data set they just made |
| Learn It | Works through seven levels: kinds of data, organizing, center, showing categories, showing numbers, spread, and change over time |

Sometimes the Lab draws a display that doesn't fit the data and asks what is wrong with it.

## Who it's for

Grades 6–12. Younger students start with kinds of data and center. Older students go on to spread, box plots and outliers.

Common Core State Standards for Mathematics:

| Standard | What it asks |
|---|---|
| 6.SP.A.1 | Recognize a statistical question: one that expects variability in the answers |
| 6.SP.A.3 | Recognize that a measure of center, and a measure of variation, each sum up a data set with one number |
| 6.SP.B.4 | Display numerical data in dot plots, histograms and box plots |
| 6.SP.B.5c | Give measures of center (median, mean) and variability (interquartile range, mean absolute deviation) |
| HSS.ID.A.1 | Represent data with dot plots, histograms and box plots |

Bar graphs, pie charts and line graphs are also taught, but they have no Common Core code of their own at these grades.

## How it teaches

- **See it first.** The Lab comes first: students make data, then draw it, before the lessons name the ideas.
- **Structure before numbers.** Students decide which displays and which measures fit a kind of data, and say what is wrong with a display that doesn't fit.
- **Guess, then check.** In the Lab, each measure is guessed before it is found.
- **A right answer is never called wrong.**

## How the math was checked

- **Test page:** [`tests.html`](https://jontaylormed.github.io/data-coach/tests.html) runs 60 tests in the browser and checks 2,070 random data sets against reference calculations. The tests cover statistical questions, which display and which measures fit, stem-and-leaf plots, pie fractions, mode, quartiles, the Lab's tally, typed answers and the worked examples. All pass.
- **Build checks:** `build.ps1` fails if the tool would make a network request or store data, if any of 22 color pairs is below its contrast target, or if a button or heading is not in Title Case.
- **Known limits:** quartiles leave the median out of both halves when the count is odd. Textbooks use more than one method, and others can give slightly different quartiles. Outliers use the 1.5 × IQR rule.
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

You can send students to one spot by adding to the link: `#level=3`, `#level=3&start=practice`, `#level=3&start=check` or `#start=menu`.

## License

[CC BY-NC-SA 4.0](LICENSE). Free to share and adapt for non-commercial use, with credit, under the same license.
