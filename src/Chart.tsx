import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { useTheme } from "@material-ui/core/styles";
import * as d3 from "d3";
import useSize from "@react-hook/size";
import _ from "lodash";
import { FairytaleData, SentenceData } from "./App";

interface ChartProps {
  setting: "readingEase" | "readingGrade";
  data: FairytaleData[] | null;
  setBrushText: React.Dispatch<React.SetStateAction<string>>;
  setBrushTitle: React.Dispatch<React.SetStateAction<string>>;
  setBrushAverage: React.Dispatch<React.SetStateAction<number>>;
  setBrushCompletion: React.Dispatch<React.SetStateAction<number>>;
}

function Chart({
  setting,
  data,
  setBrushText,
  setBrushAverage,
  setBrushTitle,
  setBrushCompletion,
}: ChartProps) {
  const theme = useTheme();
  const chartRef = useRef(null);
  const svgRef = useRef<d3.Selection<
    SVGSVGElement,
    unknown,
    HTMLElement,
    any
  > | null>(null);
  const tooltip = useRef<d3.Selection<
    SVGGElement,
    unknown,
    HTMLElement,
    any
  > | null>(null);
  const brushOverlay = useRef<d3.Selection<
    SVGPolygonElement,
    unknown,
    HTMLElement,
    any
  > | null>(null);
  const [width] = useSize(chartRef);
  const brushStartIndex = useRef(0);
  const brushDown = useRef(false);

  // Size constants
  const groupHeight = 100;
  const marginBetween = 50;
  const marginLeft = 50;
  const marginTop = 100;
  const xLabelMarginTop = 50;
  const tooltipOffset = 15;
  const tooltipHeight = 85;
  const tooltipWidth = 280;
  const tooltipOffsetHeight = 15;
  const tooltipPadding = 10;
  const tooltipCharLimit = 30;
  const tooltipLineSpacing = 3;

  // Set up y scale
  const y = useMemo(() => {
    if (data) {
      let joinSentences: Record<string, any>[] = [];
      for (const element of data) {
        joinSentences = joinSentences.concat(element.sentences);
      }
      return d3
        .scaleLinear()
        .domain([
          d3.min(joinSentences, (d) => d[setting]),
          d3.max(joinSentences, (d) => d[setting]),
        ])
        .range([groupHeight, 0]);
    }
  }, [data, setting]);

  // Initialize chart and x labels
  useEffect(() => {
    if (data && y) {
      if (!svgRef.current) {
        svgRef.current = d3
          .select("#chart-area")
          .append("svg")
          .attr("width", width)
          .attr(
            "height",
            marginTop + (groupHeight + marginBetween) * data.length
          )
          .style("overflow", "visible");
        svgRef.current
          .append("text")
          .attr("class", "xLabelTextLeft")
          .text("Beginning of Story")
          .attr("x", marginLeft)
          .attr("y", xLabelMarginTop)
          .attr("fill", "white")
          .attr("font-size", "12");
        svgRef.current
          .append("text")
          .attr("class", "xLabelTextRight")
          .text("End of Story")
          .attr("x", width)
          .attr("y", xLabelMarginTop)
          .attr("text-anchor", "end")
          .attr("fill", "white")
          .attr("font-size", "12");
      } else {
        svgRef.current.attr("width", width);
        svgRef.current.select(".xLabelTextLeft").attr("x", marginLeft);
        svgRef.current.select(".xLabelTextRight").attr("x", width);
      }
    }
  }, [y, data, width]);

  const mousemoveTooltip = useCallback(
    (e: MouseEvent, data: FairytaleData, i: number) => {
      const intervals = _.range(
        marginLeft,
        width,
        (width - marginLeft) / data.sentences.length
      );
      const bisection = d3.bisect(intervals, e.offsetX) - 1;
      if (intervals[bisection] && y && tooltip.current) {
        const yOffset = y(data.sentences[bisection][setting]);
        if (yOffset) {
          tooltip.current.attr(
            "transform",
            `translate(${intervals[bisection]}, ${
              marginTop +
              i * (groupHeight + marginBetween) +
              yOffset -
              tooltipHeight / 2
            })`
          );
        }
        let sentence = data.sentences[bisection].sentence;
        if (sentence.length > tooltipCharLimit) {
          sentence = sentence.substr(0, tooltipCharLimit - 3) + "...";
        }
        tooltip.current
          .select(".metric")
          .html(
            "<tspan font-weight='bold' alignment-baseline='text-before-edge'>" +
              setting +
              ":</tspan> " +
              data.sentences[bisection][setting]
          );
        tooltip.current
          .select(".completion")
          .html(
            "<tspan font-weight='bold' alignment-baseline='text-before-edge'>completion:</tspan> " +
              ((bisection / (data.sentences.length - 1)) * 100).toFixed(2) +
              "%"
          );
        tooltip.current.select(".sentence").text(sentence);
      }
    },
    [y, setting, width]
  );

  const mousedownBrush = useCallback(
    (e: MouseEvent, data: FairytaleData, i: number) => {
      const intervals = _.range(
        marginLeft,
        width,
        (width - marginLeft) / data.sentences.length
      );
      const bisection = d3.bisect(intervals, e.offsetX) - 1;
      brushStartIndex.current = bisection;
      brushDown.current = true;
      if (intervals[bisection] && brushOverlay.current) {
        brushOverlay.current
          .attr(
            "transform",
            `translate(${intervals[bisection]}, ${
              marginTop + i * (groupHeight + marginBetween)
            })`
          )
          .attr("points", `0,0 0,${groupHeight}`)
          .style("display", null);
      }
    },
    [width]
  );

  const mousemoveBrush = useCallback(
    (e: MouseEvent, data: FairytaleData, i: number) => {
      if (brushDown.current === true) {
        const intervals = _.range(
          marginLeft,
          width,
          (width - marginLeft) / data.sentences.length
        );
        const bisection = d3.bisect(intervals, e.offsetX) - 1;
        const endPosition = intervals[bisection];
        const offset = endPosition - intervals[brushStartIndex.current];
        if (intervals[bisection] && brushOverlay.current) {
          brushOverlay.current.attr(
            "points",
            `0,0 0,${groupHeight} ${offset},${groupHeight} ${offset},0`
          );
        }
      }
    },
    [width]
  );

  const mouseupBrush = useCallback(
    (e: MouseEvent, data: FairytaleData, i: number) => {
      const intervals = _.range(
        marginLeft,
        width,
        (width - marginLeft) / data.sentences.length
      );
      const bisection = d3.bisect(intervals, e.offsetX) - 1;
      const endPosition = intervals[bisection];
      brushDown.current = false;
      const offset = endPosition - intervals[brushStartIndex.current];
      if (intervals[bisection] && brushOverlay.current) {
        brushOverlay.current.attr("width", offset);
      }
      const beginning = Math.min(brushStartIndex.current, bisection);
      const end = Math.max(brushStartIndex.current, bisection) + 1;
      setBrushTitle(data.title);
      setBrushText(
        data.sentences
          .slice(beginning, end)
          .map((d) => d.sentence)
          .join("")
      );
      const avg = d3.mean(
        data.sentences.slice(beginning, end),
        (d) => d[setting]
      );
      setBrushAverage(avg ? +avg.toFixed(2) : 0);
      setBrushCompletion(((end - beginning) / data.sentences.length) * 100);
    },
    [
      width,
      setBrushText,
      setBrushTitle,
      setBrushAverage,
      setBrushCompletion,
      setting,
    ]
  );

  useEffect(() => {
    // Only adjust svg on resize and if data is available
    if (width !== 0 && data && y && svgRef.current) {
      const groupSelection = svgRef.current.selectAll(".group").data(data);
      groupSelection.enter().each((element, i) => {
        if (svgRef.current) {
          const group = svgRef.current
            .append("g")
            .attr("class", "group")
            .attr("id", "group" + i);
          group
            .append("text")
            .attr("class", "title")
            .text(
              element.title +
                `, avg: ` +
                d3.mean(element.sentences, (d) => d[setting])?.toFixed(2)
            )
            .attr("x", width / 2)
            .attr(
              "y",
              i * (groupHeight + marginBetween) + marginTop - marginBetween / 2
            )
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "12")
            .attr("font-weight", "bold");
          const gradient = group
            .append("linearGradient")
            .attr("id", "gradient" + i)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", i * (groupHeight + marginBetween) + marginTop)
            .attr(
              "y2",
              i * (groupHeight + marginBetween) + marginTop + groupHeight
            )
            .attr("gradientUnits", "userSpaceOnUse");
          gradient
            .append("stop")
            .attr("class", "stop1")
            .attr("offset", "0%")
            .attr(
              "stop-color",
              setting === "readingEase"
                ? theme.palette.primary.main
                : theme.palette.secondary.main
            );
          gradient
            .append("stop")
            .attr("class", "stop2")
            .attr("offset", "100%")
            .attr(
              "stop-color",
              setting === "readingGrade"
                ? theme.palette.primary.main
                : theme.palette.secondary.main
            );
          // Create y axis
          group.select(".yAxis").remove();
          const yAxis = d3.axisLeft(y);
          group
            .append("g")
            .attr("class", "yAxis")
            .attr(
              "transform",
              `translate(${marginLeft / 2}, ${
                i * (groupHeight + marginBetween) + marginTop
              })`
            )
            .call(yAxis);

          // Get x scale
          const x = d3
            .scaleLinear()
            .domain([0, element.sentences.length])
            .range([marginLeft, width]);
          // Setup line graph
          const line = d3
            .line<SentenceData>()
            .x((_, i) => {
              const scaled = x(i);
              return scaled ? scaled : 0;
            })
            .y((d) => {
              const scaled = y(d[setting]);
              return (
                (scaled ? scaled : 0) +
                i * (groupHeight + marginBetween) +
                marginTop
              );
            });
          group
            .datum(element.sentences)
            .append("path")
            .attr("class", "lineChart")
            .attr("fill", "none")
            .attr("stroke", `url(#gradient${i})`)
            .attr("stroke-width", "2")
            .attr("d", line);
          group
            .append("rect")
            .attr("class", "overlay")
            .attr("width", width - marginLeft)
            .attr("height", groupHeight)
            .attr("x", marginLeft)
            .attr("y", i * (groupHeight + marginBetween) + marginTop)
            .attr("fill", "none")
            .style("pointer-events", "all")
            .on("mouseover", () => {
              if (tooltip.current) {
                tooltip.current.style("display", null);
              }
            })
            .on("mouseout", () => {
              if (tooltip.current) {
                tooltip.current.style("display", "none");
              }
            })
            .on("mousemove", (e: any) => {
              mousemoveTooltip(e, element, i);
              mousemoveBrush(e, element, i);
            })
            .on("mousedown", (e: any) => {
              mousedownBrush(e, element, i);
            })
            .on("mouseup", (e: any) => {
              mouseupBrush(e, element, i);
            });
        }
      });
      groupSelection.each((element, i) => {
        if (svgRef.current) {
          const group = svgRef.current.select("#group" + i);
          group
            .select(".title")
            .attr("x", width / 2)
            .text(
              element.title +
                `, avg: ` +
                d3.mean(element.sentences, (d) => d[setting])?.toFixed(2)
            );
          group
            .select(".stop1")
            .transition()
            .duration(1000)
            .attr(
              "stop-color",
              setting === "readingEase"
                ? theme.palette.primary.main
                : theme.palette.secondary.main
            );
          group
            .select(".stop2")
            .transition()
            .duration(1000)
            .attr(
              "stop-color",
              setting === "readingGrade"
                ? theme.palette.primary.main
                : theme.palette.secondary.main
            );
          // Create y axis
          group.select(".yAxis").remove();
          const yAxis = d3.axisLeft(y);
          group
            .append("g")
            .attr("class", "yAxis")
            .attr(
              "transform",
              `translate(${marginLeft / 2}, ${
                i * (groupHeight + marginBetween) + marginTop
              })`
            )
            .call(yAxis);
          // Get x scale
          const x = d3
            .scaleLinear()
            .domain([0, element.sentences.length])
            .range([marginLeft, width]);
          // Setup line graph
          const line = d3
            .line<SentenceData>()
            .x((_, i) => {
              const scaled = x(i);
              return scaled ? scaled : 0;
            })
            .y((d) => {
              const scaled = y(d[setting]);
              return (
                (scaled ? scaled : 0) +
                i * (groupHeight + marginBetween) +
                marginTop
              );
            });
          group
            .select(".lineChart")
            .datum(element.sentences)
            .transition()
            .duration(1000)
            .attr("d", line);
          group
            .select(".overlay")
            .attr("width", width - marginLeft)
            .on("mousemove", (e: any) => {
              mousemoveTooltip(e, element, i);
              mousemoveBrush(e, element, i);
            })
            .on("mousedown", (e: any) => {
              mousedownBrush(e, element, i);
            })
            .on("mouseup", (e: any) => {
              mouseupBrush(e, element, i);
            });
        }
      });
      if (groupSelection.size() === 0) {
        brushOverlay.current = svgRef.current
          .append("polygon")
          .attr("class", "brushOverlay")
          .style("display", "none")
          .style("pointer-events", "none")
          .attr("points", `0,0 0,${groupHeight}`)
          .attr("fill", "white")
          .attr("fill-opacity", "20%")
          .attr("stroke", "white")
          .attr("stroke-width", "1");
        tooltip.current = svgRef.current
          .append("g")
          .style("display", "none")
          .attr("class", "tooltip")
          .style("pointer-events", "none");
        tooltip.current
          .append("polygon")
          .attr("fill", "white")
          .attr(
            "points",
            `0,${tooltipHeight / 2}
            ${tooltipOffset},${tooltipHeight / 2 - tooltipOffsetHeight / 2}
            ${tooltipOffset},0
            ${tooltipWidth},0
            ${tooltipWidth},${tooltipHeight}
            ${tooltipOffset},${tooltipHeight}
            ${tooltipOffset},${tooltipHeight / 2 + tooltipOffsetHeight / 2}`
          )
          .attr("width", tooltipWidth)
          .attr("x", tooltipOffset)
          .attr("stroke", "black")
          .attr("stroke-width", "2");
        tooltip.current
          .append("text")
          .attr("class", "metric")
          .text("blah")
          .attr("fill", "black")
          .attr("alignment-baseline", "text-before-edge")
          .attr("y", tooltipPadding)
          .attr("x", tooltipOffset + tooltipPadding);
        const metric = tooltip.current.select(".metric").node();
        if (metric && metric instanceof SVGGraphicsElement) {
          const textHeight = metric.getBBox().height;
          tooltip.current
            .append("text")
            .attr("class", "completion")
            .attr("fill", "black")
            .attr("alignment-baseline", "text-before-edge")
            .attr("y", () => {
              return textHeight + tooltipLineSpacing + tooltipPadding;
            })
            .attr("x", tooltipOffset + tooltipPadding);
          tooltip.current
            .append("text")
            .attr("class", "sentence")
            .attr("font-style", "italic")
            .attr("fill", "black")
            .attr("alignment-baseline", "text-before-edge")
            .attr("y", () => {
              return 2 * (textHeight + tooltipLineSpacing) + tooltipPadding;
            })
            .attr("x", tooltipOffset + tooltipPadding);
        }
      }
    }
  }, [
    width,
    theme,
    data,
    y,
    mousemoveTooltip,
    mousedownBrush,
    mouseupBrush,
    mousemoveBrush,
    setting,
  ]);
  return <div id="chart-area" ref={chartRef}></div>;
}

export default Chart;
