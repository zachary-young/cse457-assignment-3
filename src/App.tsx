/// <reference path="./types.d.ts" />
import React, { useState, useEffect } from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Chart from "./Chart";
import AverageChart from "./AverageChart";
import clsx from "clsx";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import * as d3 from "d3";
import rs from "text-readability";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    grid: {
      padding: theme.spacing(3, 3, 0),
    },
    root: {
      background: theme.palette.background.default,
      height: "100vh",
      overflowY: "scroll",
      overflowX: "hidden",
    },
    title: {
      flexGrow: 1,
    },
    paper: {
      padding: theme.spacing(3),
      position: "relative",
    },
    metric: {
      fontStyle: "italic",
    },
    chart: {
      zIndex: 1000,
    },
    formControl: {
      minWidth: 300,
    },
    miniChart: {
      paddingBottom: theme.spacing(15),
      marginBottom: theme.spacing(3),
    },
    panelTitle: {
      marginBottom: theme.spacing(3),
    },
  })
);

export interface SentenceData {
  sentence: string;
  readingEase: number;
  readingGrade: number;
}

export interface FairytaleData {
  title: string;
  sentences: SentenceData[];
}

function App() {
  const classes = useStyles();
  const [setting, setSetting] = useState<"readingEase" | "readingGrade">(
    "readingEase"
  );
  const [data, setData] = useState<FairytaleData[] | null>(null);
  const [brushText, setBrushText] = useState("");
  const [brushTitle, setBrushTitle] = useState("");
  const [brushAverage, setBrushAverage] = useState(0);
  const [brushCompletion, setBrushCompletion] = useState(0);
  const handleChange = () => {
    setSetting((setting) =>
      setting === "readingEase" ? "readingGrade" : "readingEase"
    );
  };

  useEffect(() => {
    // Wait for all files to load using promises
    const textPromises = [];
    const fileNames = [
      "tom-tit-tot.txt",
      "the-three-sillies.txt",
      "the-rose-tree.txt",
      "the-old-woman.txt",
      "jack-fortune.txt",
      "mr-vinegar.txt",
    ];
    for (const file of fileNames) {
      textPromises.push(
        d3.text(process.env.PUBLIC_URL + `/englishfairytales/${file}`)
      );
    }
    Promise.all(textPromises).then((fairytales) => {
      // Loop through each fairytale
      const dataObj = [];
      for (let fairytale of fairytales) {
        // Grab the title
        const byLine = fairytale.split("\n");
        const title = byLine[0];
        fairytale = byLine.splice(1).join("\n");
        // Extract each sentence
        const sentencesString = fairytale.match(
          /\s?([^.!?,:()]|[:,](?!\s*“|”\s))+([.!?,:()]|[:,](?=\s+“|”\s+))+["”]?/g
        );
        // Grade each sentence based on Flesch-kincaid scale
        const sentences: SentenceData[] = [];
        if (sentencesString) {
          for (const element of sentencesString) {
            const sentenceObj: SentenceData = {
              sentence: element,
              readingEase: rs.fleschReadingEase(element),
              readingGrade: rs.fleschKincaidGrade(element),
            };
            sentences.push(sentenceObj);
          }
        }
        dataObj.push({
          title,
          sentences,
        });
      }
      setData(dataObj);
    });
  }, []);

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Assignment 3
          </Typography>
        </Toolbar>
      </AppBar>
      <Grid container spacing={3} className={classes.grid}>
        <Grid item xs={12} sm={7}>
          <Paper className={clsx(classes.paper, classes.chart)}>
            <FormControl className={classes.formControl}>
              <InputLabel id="demo-simple-select-label">Age</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={setting}
                onChange={handleChange}
              >
                <MenuItem value={"readingEase"}>
                  Flesch-Kincaid Reading Ease
                </MenuItem>
                <MenuItem value={"readingGrade"}>
                  Flesch-Kincaid Grading Level
                </MenuItem>
              </Select>
            </FormControl>
            <Chart
              setting={setting}
              data={data}
              setBrushText={setBrushText}
              setBrushAverage={setBrushAverage}
              setBrushTitle={setBrushTitle}
              setBrushCompletion={setBrushCompletion}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={5}>
          <Paper className={clsx(classes.paper, classes.miniChart)}>
            <Typography variant="h6" className={classes.panelTitle}>
              Averages{" "}
            </Typography>
            <AverageChart
              setting={setting}
              data={data}
              setBrushText={setBrushText}
              setBrushTitle={setBrushTitle}
              setBrushAverage={setBrushAverage}
              setBrushCompletion={setBrushCompletion}
            />
          </Paper>
          {brushText && (
            <Paper className={classes.paper}>
              <Typography variant="h6">Brush Selection</Typography>
              <Typography
                variant="body1"
                id="currentAvg"
                className={classes.metric}
              ></Typography>
              <Typography variant="body1">
                <strong>Fairytale:</strong> {brushTitle}
              </Typography>
              <Typography variant="body1">
                <strong>Average:</strong> {brushAverage}
              </Typography>
              <Typography variant="body1">
                <strong>Completion:</strong> {brushCompletion.toFixed(2)}%
              </Typography>
              <Typography variant="body1">
                <em>{brushText}</em>
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </div>
  );
}

export default App;
