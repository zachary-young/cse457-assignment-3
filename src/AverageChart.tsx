import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useTheme } from "@material-ui/core/styles";
import * as d3 from "d3";
import useSize from "@react-hook/size";
import { FairytaleData } from "./App";

interface AverageChartProps {
  setting: "readingEase" | "readingGrade";
  data: FairytaleData[] | null;
  setBrushText: React.Dispatch<React.SetStateAction<string>>;
  setBrushTitle: React.Dispatch<React.SetStateAction<string>>;
  setBrushAverage: React.Dispatch<React.SetStateAction<number>>;
  setBrushCompletion: React.Dispatch<React.SetStateAction<number>>;
}

function AverageChart({
  setting,
  data,
  setBrushText,
  setBrushTitle,
  setBrushAverage,
  setBrushCompletion,
}: AverageChartProps) {
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
  const [width] = useSize(chartRef);

  // Size constants
  const svgHeight = 300;
  const marginLeft = 20;
  const barGap = 10;
  const rangeExtend = useMemo(
    () => ({
      readingEase: 10,
      readingGrade: 2,
    }),
    []
  );
  const tooltipOffset = 15;
  const tooltipHeight = 40;
  const tooltipWidth = 170;
  const tooltipOffsetWidth = 15;
  const tooltipPadding = 10;
  const marginBottom = 20;

  // Set up y scale
  const y = useMemo(() => {
    if (data) {
      const averages: number[] = [];
      for (const element of data) {
        const mean = d3.mean(element.sentences, (d) => d[setting]);
        if (mean) {
          averages.push(mean);
        }
      }
      const minAvg = d3.min(averages);
      const maxAvg = d3.max(averages);
      if (minAvg && maxAvg) {
        return d3
          .scaleLinear()
          .domain([
            minAvg - rangeExtend[setting],
            maxAvg + rangeExtend[setting],
          ])
          .range([svgHeight, 0]);
      }
    }
  }, [data, setting, rangeExtend]);

  // Set up x scale
  const x = useMemo(() => {
    if (data) {
      return d3
        .scaleBand()
        .domain(data.map((e) => e.title))
        .range([marginLeft, width]);
    }
  }, [data, width]);

  const mousemove = useCallback(
    (d: FairytaleData) => {
      if (x && tooltip.current && y) {
        const xOffset = x(d.title);
        if (xOffset) {
          const alignXOffset = xOffset - tooltipWidth / 2;
          const yAvg = d3.mean(d.sentences, (d) => d[setting]);
          if (yAvg) {
            const yOffset = y(yAvg);
            if (yOffset) {
              tooltip.current
                .attr(
                  "transform",
                  `translate(${alignXOffset + x.bandwidth() / 2}, ${
                    svgHeight - yOffset - tooltipHeight - tooltipOffset
                  })`
                )
                .select("text")
                .html(
                  "<tspan font-weight='bold' alignment-baseline='text-before-edge'>" +
                    setting +
                    ":</tspan> " +
                    yAvg.toFixed(2)
                );
            }
          }
        }
      }
    },
    [x, y, setting]
  );

  useEffect(() => {
    if (data && y && x) {
      if (!svgRef.current) {
        svgRef.current = d3
          .select("#chart-area-2")
          .append("svg")
          .attr("width", width)
          .attr("height", svgHeight)
          .style("overflow", "visible");
      } else {
        svgRef.current.attr("width", width);
      }
      // Set up axes
      svgRef.current.selectAll(".axis").remove();
      const xAxis = d3.axisBottom(x);
      const yAxis = d3.axisLeft(y);
      const xAxisGroup = svgRef.current
        .append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${svgHeight})`);
      const yAxisGroup = svgRef.current.append("g").attr("class", "axis");
      yAxisGroup.call(yAxis).attr("transform", `translate(${marginLeft},0)`);
      xAxisGroup.call(xAxis);
      xAxisGroup
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", `translate(0,${marginBottom}) rotate(-20) `);
    }
  }, [y, data, width, x]);

  useEffect(() => {
    // Only adjust svg on resize and if data is available
    if (width !== 0 && data && y && x && svgRef.current) {
      // Create bar chart

      const barSelection = svgRef.current.selectAll(".average");
      // ENTER
      barSelection
        .data(data)
        .enter()
        .append("rect")
        .attr("pointer-events", "all")
        .attr("class", "average")
        .attr("x", (d) => {
          const xOffset = x(d.title);
          return xOffset ? xOffset + barGap / 2 : 0;
        })
        .attr("y", (d) => {
          let yOffset = d3.mean(d.sentences, (d) => d[setting]);
          if (yOffset) {
            yOffset = y(yOffset);
            return yOffset ? svgHeight - yOffset : 0;
          }
          return 0;
        })
        .attr("width", x.bandwidth() - barGap)
        .attr("height", (d) => {
          let mean = d3.mean(d.sentences, (d) => d[setting]);
          if (mean) {
            mean = y(mean);
            return mean ? mean : 0;
          }
          return 0;
        })
        .attr("fill", theme.palette.primary.main)
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
        // Bug in d3-types, d is not number
        // @ts-ignore
        .on("mousemove", (_, d: FairytaleData) => {
          if (tooltip.current) {
            mousemove(d);
          }
        })
        // Bug in d3-types, d is not number
        // @ts-ignore
        .on("click", (_, d: FairytaleData) => {
          setBrushText(d.sentences.map((d) => d.sentence).join(""));
          setBrushTitle(d.title);
          const mean = d3.mean(d.sentences, (d) => d[setting]);
          setBrushAverage(mean ? +mean.toFixed(2) : 0);
          setBrushCompletion(100);
        });

      // UPDATE
      barSelection
        .data(data)
        .attr("x", (d) => {
          const xOffset = x(d.title);
          return xOffset ? xOffset + barGap / 2 : 0;
        })
        .attr("width", x.bandwidth() - barGap)
        .on("mousemove", (_, d) => {
          if (tooltip.current) {
            // Bug in d3-types, d is not number
            // @ts-ignore
            mousemove(d);
          }
        })
        .transition()
        .duration(1000)
        .attr("y", (d) => {
          let yOffset = d3.mean(d.sentences, (d) => d[setting]);
          if (yOffset) {
            yOffset = y(yOffset);
            return yOffset ? svgHeight - yOffset : 0;
          }
          return 0;
        })
        .attr("height", (d) => {
          let mean = d3.mean(d.sentences, (d) => d[setting]);
          if (mean) {
            mean = y(mean);
            return mean ? mean : 0;
          }
          return 0;
        })
        .attr("fill", theme.palette.primary.main)
        // Bug in d3-types, d is not number
        // @ts-ignore
        .on("click", (_, d: FairytaleData) => {
          setBrushText(d.sentences.map((d) => d.sentence).join(""));
          setBrushTitle(d.title);
          const mean = d3.mean(d.sentences, (d) => d[setting]);
          setBrushAverage(mean ? +mean.toFixed(2) : 0);
          setBrushCompletion(100);
        });

      svgRef.current.select(".tooltip").remove();
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
          `0,0
          ${tooltipWidth},0
          ${tooltipWidth},${tooltipHeight}
          ${tooltipWidth / 2 + tooltipOffsetWidth / 2},${tooltipHeight}
          ${tooltipWidth / 2},${tooltipHeight + tooltipOffset}
          ${tooltipWidth / 2 - tooltipOffsetWidth / 2},${tooltipHeight}
          0,${tooltipHeight}`
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
        .attr("text-anchor", "middle")
        .attr("y", tooltipPadding)
        .attr("x", tooltipWidth / 2);
    }
  }, [
    width,
    theme,
    data,
    y,
    setting,
    x,
    mousemove,
    setBrushText,
    setBrushTitle,
    setBrushAverage,
    setBrushCompletion,
  ]);
  return <div id="chart-area-2" ref={chartRef}></div>;
}

export default AverageChart;
