//Separate from Graphing API, but needs to be included as many of the operations take advantage of vector operations 
function __InitVectorOperations()
{
	var Operator = 
	{
		Vec2: function(_X, _Y){ var Vec = {X:_X, Y:_Y}; return Vec;},
		Add: function(A, B){ var Vec = this.Vec2(A.X + B.X, A.Y + B.Y); return Vec;},
		Sub: function(A, B){ var Vec = this.Vec2(A.X - B.X, A.Y - B.Y); return Vec;}, 
		Mul: function(A, B){ var Vec = this.Vec2(A.X * B, A.Y * B); return Vec;},
		Div: function(A, B){
		      if(B == 0){ var DivByZeroDefault = this.Vec2(0,0);  return DivByZeroDefault;}
		      else{ var Vec = this.Vec2(A.X / B, A.Y / B);  return Vec;}},
		Length: function(A){ var Length = Math.sqrt(A.X * A.X + A.Y * A.Y); return Length;},
		Unit: function(A){ var Unit = this.Div(A, this.Length(A));  return Unit;},
		Abs: function(A){ var Abs = this.Vec2(Math.abs(A.X), Math.abs(A.Y));  return Abs;},
		Hadamard: function(A, B){ var Hadamard = this.Vec2(A.X * B.X, A.Y * B.Y); return Hadamard;},
		DOT: function(A, B){ var DOT = A.X * B.X + A.Y * B.Y; return DOT;},
		Rotate: function(A, Theta){ var Rot = this.Vec2(A.X * Math.cos(Theta) + A.Y * Math.sin(Theta), -A.X * Math.sin(Theta) + A.Y * Math.cos(Theta)); return Rot;},
		MAX_VECTOR: function(){ var Max = this.Vec2(Number.MAX_VALUE, Number.MAX_VALUE);  return Max;},
		MIN_VECTOR: function(){ var Min = this.Vec2(-Number.MAX_VALUE, -Number.MAX_VALUE);  return Min;},
		Rect: function(_Start, _Dim){ var Rect = {Start: _Start, Dimensions: _Dim}; return Rect;},			
		Line: function(_Start, _End){ var Line = {Start: _Start, End: _End};  return Line;}
	};

	return Operator;
}

//Canvas: HTML5 Canvas variable
//_LabelRatio: Anonymous object indication the ratio of the graph area to be used for the label and axis ticks
//var _LabelRatio = {X: _ProportionXAxisReserved, Y: _ProportionYAxisReserved}
function InitializeGraph(_Canvas,
DOMStartX, DOMStartY, DOMEndX, DOMEndY,
GraphStartX, GraphStartY, GraphEndX, GraphEndY, 
_LabelRatio)
{
	var __Vec = __InitVectorOperations();
	
//_DOMBounds: the boundaries of the DOM canvas object
//_GraphBounds: the boundaries of the actual graph on the canvas object, origin in top left
	var _DOMBounds =  {Start: __Vec.Vec2(DOMStartX, DOMStartY), Dimensions:__Vec.Vec2(DOMEndX - DOMStartX, DOMEndY - DOMStartY)};
	var _GraphBounds = {Start: __Vec.Vec2(GraphStartX, GraphStartY), Dimensions:__Vec.Vec2(GraphEndX - GraphStartX, GraphEndY - GraphStartY)};

	var _XAxisLabel = {ID: "X",
					   Label: {Text: null,Dimensions: null}, 
					   Unit:  {Text: null,Dimensions: null}, 
					   Ticks: {NumberMajorTicks: null, 
					   		   NumberMinorTicksPerMajorTick: null, 
					   		   TickSize: {Major: 10, Minor: 5}},
					   LabelOffsets: null,
					   UnitOffsets:  null};

	var _YAxisLabel = {ID: "Y",
					   Label: {Text: null,Dimensions: null}, 
					   Unit:  {Text: null,Dimensions: null}, 
					   Ticks: {NumberMajorTicks: null, 
					   		   NumberMinorTicksPerMajorTick: null, 
					   		   TickSize: {Major: 10, Minor: 5}},
					   LabelOffsets: null,
					   UnitOffsets:  null};

//The object to be returned that contains all of the graphing functions. To avoid polluting the global namespace, all intermediate
//functions are stored in the object Intermediate, all utility functions are stored in the Utility object, both inside of the graph
//object. The distinction between the two is that utility functions are not necessarily only intended for use inside of the graph
//functions, while Intermediate functions are only meant for use inside the graph to reduce code complexity, and make no sense
//elsewhere.
	var Graph = {
					Context: _Canvas.getContext("2d"),
					DOMBounds: _DOMBounds,
					GraphBounds: _GraphBounds,
			   		XAxis: _XAxisLabel,
			   		YAxis: _YAxisLabel,
					PlotBounds: __Vec.Rect(__Vec.Vec2(_GraphBounds.Start.X + _GraphBounds.Dimensions.X * _LabelRatio.X, _GraphBounds.Start.Y + _GraphBounds.Dimensions.Y * _LabelRatio.Y), __Vec.Vec2(_GraphBounds.Dimensions.X * (1-_LabelRatio.X), _GraphBounds.Dimensions.Y * (1-_LabelRatio.Y))),
					GraphData: {Max: __Vec.MIN_VECTOR(), Min: __Vec.MAX_VECTOR(), DataSets: []},
					PlotTransform: null,
					
					//SetXAxis sets the label text and tick parameters for the X Axis
					SetXAxis: function(_LabelText, _UnitText, _NumberMajorTicks, _MinorTicksPerMajorTick, _TickSize)
					{
						this.XAxis.Label.Text ="(" + _LabelText + ")";
						this.XAxis.Unit.Text = "(" + _UnitText + ")";
						this.XAxis.Ticks.NumberMajorTicks = _NumberMajorTicks;
						this.XAxis.Ticks.NumberMinorTicksPerMajorTick = _MinorTicksPerMajorTick;
						if(_TickSize)
						{
							this.XAxis.Ticks.TickSize = _TickSize;
						}

						var XAxisLabelDimensions = this.Utility.__MeasureText(this.Context, 24, "Sans Serif", _LabelText);;
						this.XAxis.Label.Dimensions = XAxisLabelDimensions;

						var XAxisUnitDimensions = this.Utility.__MeasureText(this.Context, 18, "Sans Serif", _UnitText);;
						this.XAxis.Unit.Dimensions = XAxisUnitDimensions;

						this.XAxis.LabelOffsets = __Vec.Vec2((this.DOMBounds.Dimensions.X - XAxisLabelDimensions.X) / 2, 8);
					    this.XAxis.UnitOffsets = __Vec.Vec2((this.DOMBounds.Dimensions.X - XAxisUnitDimensions.X) / 2, -10);
					},
					//SetYAxis sets the label text and tick parameters for the Y Axis. Separate from the X Axis because the
					//Y label requires a rotation of the canvas draw context. Can be generalized with the X Axis but there are
					//lower hanging and tastier fruit at the moment.
					SetYAxis: function(_LabelText, _UnitText, _NumberMajorTicks, _MinorTicksPerMajorTick, _TickSize)
					{
						this.YAxis.Label.Text = "(" + _LabelText + ")";
						this.YAxis.Unit.Text = "(" + _UnitText + ")";
						this.YAxis.Ticks.NumberMajorTicks = _NumberMajorTicks;
						this.YAxis.Ticks.NumberMinorTicksPerMajorTick = _MinorTicksPerMajorTick;
						if(_TickSize)
						{
							this.YAxis.Ticks.TickSize = _TickSize;
						}

						var YAxisLabelDimensions = this.Utility.__MeasureText(this.Context, 24, "Sans Serif", _LabelText);;
						this.YAxis.Label.Dimensions = YAxisLabelDimensions;

						var YAxisUnitDimensions = this.Utility.__MeasureText(this.Context, 18, "Sans Serif", _UnitText);;
						this.YAxis.Unit.Dimensions = YAxisUnitDimensions;

						this.YAxis.LabelOffsets = __Vec.Vec2((_DOMBounds.Dimensions.X - _GraphBounds.Dimensions.X) / 2, (_DOMBounds.Dimensions.Y - YAxisLabelDimensions.X) / 2);
						this.YAxis.UnitOffsets = __Vec.Vec2(((_DOMBounds.Dimensions.X - _GraphBounds.Dimensions.X) / 2) + 20,(_DOMBounds.Dimensions.Y - YAxisUnitDimensions.X) / 2);
					},
					//Adds a data set to be drawn The data set _is_ required to be in a certain format.
					//prototype below:
					//var _DataSet = {Datum: [], Min: Vec.MAX_VECTOR(), Max: Vec.MIN_VECTOR(), NumberOfDatapoints: 0}
					//Min and max are necessary as the graph axes and plot transdormation are based upon the bounds outlined by the min and the max
					//Number of datapoints is not necessary, but can be convenient
					//multiple datasets can be plotted on the same graph (although ensuring that the data range is similar is important)
					AddDataSet: function(_DataSet, DrawColor)
					{
						this.GraphData.DataSets.push({DataSet: _DataSet, DrawColor: DrawColor});

						for(var i = 0;
							i < this.GraphData.DataSets.length;
							++i)
						{
							var NextSetToCheck = this.GraphData.DataSets[i].DataSet;

							if(NextSetToCheck.Min.X < this.GraphData.Min.X)	{ this.GraphData.Min.X = NextSetToCheck.Min.X; }
							if(NextSetToCheck.Min.Y < this.GraphData.Min.Y) { this.GraphData.Min.Y = NextSetToCheck.Min.Y; }
							if(NextSetToCheck.Max.X > this.GraphData.Max.X) { this.GraphData.Max.X = NextSetToCheck.Max.X; }
							if(NextSetToCheck.Max.Y > this.GraphData.Max.Y) { this.GraphData.Max.Y = NextSetToCheck.Max.Y; }
						}

						this.PlotTransform = function(_X, _Y)
				   		{
				   			var X = this.PlotBounds.Start.X +  this.PlotBounds.Dimensions.X * (_X - this.GraphData.Min.X) / (this.GraphData.Max.X - this.GraphData.Min.X);
				   			var Y = this.PlotBounds.Start.Y +  this.PlotBounds.Dimensions.Y * (_Y - this.GraphData.Min.Y) / (this.GraphData.Max.Y - this.GraphData.Min.Y);
				   			
				   			return this.GraphTransform(X,Y);
				   		};
					},
					//Used to clear out the graphs datasets, necessary if you wish to reset the axes and transform
					ClearData: function()
					{
						this.GraphData.DataSets = [];
						
						this.PlotTransform = null;
						
						this.GraphData.Max = __Vec.MIN_VECTOR();
						this.GraphData.Min = __Vec.MAX_VECTOR();
					},
					//transforms points from the canvas basis to the graph basis, origin is bottom left
					GraphTransform: function(_X, _Y)
					{
						var X = this.GraphBounds.Start.X + _X;
						var Y = this.DOMBounds.Dimensions.Y - (this.GraphBounds.Start.Y + _Y);

						return __Vec.Vec2(X,Y);
					},
					//function that draws the initial graph axes and labels (but doesnt plot). I Recommend setting the axes and dataset before drawing
			   		DrawGraph: function()
			   		{
			   			var _XAxis = __Vec.Line(__Vec.Vec2(this.PlotBounds.Start.X, this.PlotBounds.Start.Y), __Vec.Vec2(this.PlotBounds.Start.X + this.PlotBounds.Dimensions.X, this.PlotBounds.Start.Y));
			   			var _YAxis = __Vec.Line(__Vec.Vec2(this.PlotBounds.Start.X, this.PlotBounds.Start.Y), __Vec.Vec2(this.PlotBounds.Start.X, this.PlotBounds.Start.Y + this.PlotBounds.Dimensions.Y));

			   			this.Utility.__DrawLine(this.Context, this.GraphTransform(_XAxis.Start.X, _XAxis.Start.Y),this.GraphTransform(_XAxis.End.X, _XAxis.End.Y), "black");
			   			this.Utility.__DrawLine(this.Context, this.GraphTransform(_YAxis.Start.X, _YAxis.Start.Y),this.GraphTransform(_YAxis.End.X, _YAxis.End.Y), "black");

						this.Intermediate.DrawAxis(this, this.XAxis, _XAxis, _YAxis);
						this.Intermediate.DrawAxis(this, this.YAxis, _YAxis, _XAxis);

			   			this.Intermediate.DrawAxisLabel(this, this.XAxis);
			   			this.Intermediate.DrawAxisLabel(this, this.YAxis);
			   		},
			   		//Plots points from a specific dataset on the graph, uses PlotTransform(). *Note The transform is set by the bounds
			   		//outlined by ALL DATASETS, meaning plotting from one dataset will not use a transform unique to that dataset.
			   		PlotDataSet: function(Index)
			   		{
			   			var DataSet = this.GraphData.DataSets[Index].DataSet;
			   			var Color = this.GraphData.DataSets[Index].DrawColor;

			   			for(var i = 0;
			   				i < DataSet.NumberOfDatapoints;
			   				++i)
			   			{
			   				var DataPointLocation = this.PlotTransform(DataSet.Datum[i].X, DataSet.Datum[i].Y);
			   				
			   				this.Context.fillStyle = Color;
			   				this.Context.fillRect(DataPointLocation.X - 1, DataPointLocation.Y - 1, 2, 2);
			   			}
			   		},
			   		//Plots points from all data sets on the graph
			   		PlotDataSets: function()
			   		{
			   			for(var i = 0;
			   				i < this.GraphData.DataSets.length;
			   				++i)
			   			{
			   				var SetIndex = i;
			   				
			   				this.PlotDataSet(SetIndex);
			   			}
			   		},
			   		// Same as PlotDataSet, except drawn with contiguous lines (not smoothed), assumes the data set is sorted in the manner befitting the use.
			   		GraphDataSet: function(Index)
			   		{
			   			var DataSet = this.GraphData.DataSets[Index].DataSet;
			   			var Color = this.GraphData.DataSets[Index].DrawColor;
			   			var LastDataPointLocation = this.PlotTransform(DataSet.Datum[0].X, DataSet.Datum[0].Y);
			   			
			   			for(var i = 1;
			   				i < DataSet.NumberOfDatapoints;
			   				++i)
			   			{
			   				var NextDataPointLocation = this.PlotTransform(DataSet.Datum[i].X, DataSet.Datum[i].Y);
			   				
			   				this.Utility.__DrawLine(this.Context,LastDataPointLocation, NextDataPointLocation, Color);
			   				
			   				LastDataPointLocation = NextDataPointLocation;
			   			}
			   		},
			   		//Same as GraphDataSet, but for all datasets
			   		GraphDataSets: function()
			   		{
			   			for(var i = 0;
			   				i < this.GraphData.DataSets.length;
			   				++i)
			   			{
			   				var SetIndex = i;
			   				
			   				this.GraphDataSet(SetIndex);
			   			}
			   		},
			   		Utility: 
		   			{
		   			//line drawing function, not necessarily for internal use alone
		   				__DrawLine: function(Context, _Start, _End, _Color)
						{
							Context.beginPath();
							Context.strokeStyle = _Color;
							
							Context.moveTo(_Start.X, _Start.Y);
							Context.lineTo(_End.X, _End.Y);
							Context.stroke();
						},
						//measures the size of an output string on the canvas
						//The size is the font size (in pixels), 
						//The font is font type, Eg: "Sans Serif"
						//The Text is the actual string you would like to be measured
						__MeasureText: function(Context, Size, Font, Text)
						{
							Context.font = toString(Size) + "px " + Font;
							Context.textAlign = "left";
							TextDimensions = __Vec.Vec2(Context.measureText(Text).width, 24);
							
							return TextDimensions;
						},
						//clears the canvas to a certain color
						WipeCanvas: function(_Canvas, Color)
			   			{
			   				var Context = _Canvas.getContext("2d");
			   				
			   				Context.fillStyle = Color;
			   				Context.fillRect(0, 0, _Canvas.width, _Canvas.height);
			   			}
		   			},
		   			Intermediate:
		   			{
		   			  //Label helper function, labels given axis, will be generalized in the future
		   				DrawAxisLabel: function (Graph, Axis)
						{
							var LabelWidth = Axis.Label.Dimensions;
							var UnitWidth = Axis.Unit.Dimensions;

							if(Axis.ID == "X")
							{
								Graph.Context.font = "24px Sans Serif";
								Graph.textAlign = "left";
								var TransformedLabelOffset = Graph.GraphTransform(Axis.LabelOffsets.X, Axis.LabelOffsets.Y);
								Graph.Context.fillText(Axis.Label.Text, TransformedLabelOffset.X, TransformedLabelOffset.Y);

								Graph.Context.font = "18px Sans Serif";
								Graph.textAlign = "left";
								var TransformedUnitOffset = Graph.GraphTransform(Axis.UnitOffsets.X, Axis.UnitOffsets.Y);
								Graph.Context.fillText(Axis.Unit.Text, TransformedUnitOffset.X, TransformedUnitOffset.Y);
							}

							if(Axis.ID == "Y")
							{
								Graph.Context.rotate(-90 * Math.PI/180);


								Graph.Context.font = "24px Sans Serif";
								Graph.textAlign = "left";
								var TransformedLabelOffset = Graph.GraphTransform(Axis.LabelOffsets.X, Axis.LabelOffsets.Y);
								Graph.Context.fillText(Axis.Label.Text, -TransformedLabelOffset.Y , TransformedLabelOffset.X);
								//Graph.Context.fillText(Axis.Label.Text, -210, 50);

								Graph.Context.font = "18px Sans Serif";
								Graph.textAlign = "left";
								var TransformedUnitOffset = Graph.GraphTransform(Axis.UnitOffsets.X, Axis.UnitOffsets.Y);
								Graph.Context.fillText(Axis.Unit.Text, -TransformedUnitOffset.Y, TransformedUnitOffset.X);
								//Graph.Context.fillText(Axis.Unit.Text, -205, 70);


								Graph.Context.setTransform(1,0,0,1,0,0);
							}
						},
						//Helper function determining the number of digits that should be reasonably displayed by the axis tick marks.
						//Could use work, need to think about what looks best (because at the end of the day it is a cosmetic thing). 
						FindSignificantFigures: function(Value, DataMin, DataMax, NumberOfTicks)
						{
							var DataRange = DataMax - DataMin;
							var TickSize = DataRange / NumberOfTicks;
							
							var DataSetFractionalMin = DataMin - parseInt(DataMin);
							
							var TickIntegerPart = Math.floor(TickSize);
							var TickFractionalPart = TickSize - TickIntegerPart;
							var ValueIntegerPart = (Value > 0) ? Math.floor(Value) : Math.ceil(Value);
							var ValueFractionalPart = Value - ValueIntegerPart;

							if((ValueFractionalPart < DataSetFractionalMin) && (ValueFractionalPart < TickFractionalPart / 10))
							{
								ValueFractionalPart = 0
							}
							if(DataSetFractionalMin == 0 && TickFractionalPart == 0)
							{
								ValueFractionalPart = 0;
							}

							var FractionalSigFigs = ((TickFractionalPart != 0) ? (Math.abs(parseInt(Math.log10(TickFractionalPart))) + 1) : 1);
							var IntegerSigFigs = 	((ValueIntegerPart != 0)   ? (Math.abs(parseInt(Math.log10(ValueIntegerPart))) + 1)   : 1);
							
							if(ValueFractionalPart > 0 && ValueIntegerPart > 0)
							{
								var SigFigs = IntegerSigFigs + FractionalSigFigs;
								return SigFigs;
							}
							else
							{
								var SigFigs = IntegerSigFigs;
								return SigFigs;	
							}
						},
						//Helper function draws axis and ticks, for thematic consistency the tick drawing could be done in the label drawing area,
						//but that would require redoing all of the work to determine correct spacing all over again (or storing the old work). 
						//Need to think about what is best. For now, this is the solution.
						DrawAxis: function(Graph,Axis,AxisBounds,OppAxisBounds)
						{
							var AxisVector = __Vec.Sub(AxisBounds.End, AxisBounds.Start);
							var AxisDirection = __Vec.Unit(AxisVector);
							var OppAxisVector = __Vec.Sub(OppAxisBounds.End, OppAxisBounds.Start);
							var OppAxisDirection = __Vec.Unit(OppAxisVector);
							
							for(var j = 0;
								j <= Axis.Ticks.NumberMajorTicks;
								++j)
							{
								var MajorTickStart = __Vec.Add(AxisBounds.Start, __Vec.Mul(AxisVector, (j/Axis.Ticks.NumberMajorTicks)));
								var MajorTickEnd = __Vec.Sub(MajorTickStart, __Vec.Mul(OppAxisDirection, Axis.Ticks.TickSize.Major));
								var MajorTickSeparation = __Vec.Div(AxisVector, Axis.Ticks.NumberMajorTicks);
								Graph.Utility.__DrawLine(Graph.Context, Graph.GraphTransform(MajorTickStart.X, MajorTickStart.Y), Graph.GraphTransform(MajorTickEnd.X, MajorTickEnd.Y), "black");

								if(j != Axis.Ticks.NumberMajorTicks)
								{
									for(var i = 1;
										i < Axis.Ticks.NumberMinorTicksPerMajorTick;
										++i)
									{
										var MinorTickStart = __Vec.Add(MajorTickStart, __Vec.Mul(MajorTickSeparation, i / Axis.Ticks.NumberMinorTicksPerMajorTick));
										var MinorTickEnd = __Vec.Sub(MinorTickStart, __Vec.Mul(OppAxisDirection, Axis.Ticks.TickSize.Minor));
										Graph.Utility.__DrawLine(Graph.Context, Graph.GraphTransform(MinorTickStart.X, MinorTickStart.Y), Graph.GraphTransform(MinorTickEnd.X, MinorTickEnd.Y), "black");
									}
								}
							

								Graph.Context.font = "10px Sans Serif";
								Graph.Context.textAlign = "left";

								var NumberLength;
								var AxisDependentOffset;
								var TickValue;
								if(Axis.ID == "X")
								{
									TickValue = (Graph.GraphData.Min.X + (j / Axis.Ticks.NumberMajorTicks) * (Graph.GraphData.Max.X - Graph.GraphData.Min.X));
									var SigFigs = Graph.Intermediate.FindSignificantFigures(TickValue, Graph.GraphData.Min.X, Graph.GraphData.Max.X, Axis.Ticks.NumberMajorTicks);
									TickValue = TickValue.toPrecision(SigFigs);
									NumberLength = Graph.Context.measureText(TickValue).width;
									
									AxisDependentOffset = __Vec.Mul(AxisDirection, NumberLength / 2);
								}
								if(Axis.ID == 'Y')
								{
									TickValue = (Graph.GraphData.Min.Y + (j / Axis.Ticks.NumberMajorTicks) * (Graph.GraphData.Max.Y - Graph.GraphData.Min.Y));
									var SigFigs = Graph.Intermediate.FindSignificantFigures(TickValue, Graph.GraphData.Min.X, Graph.GraphData.Max.X, Axis.Ticks.NumberMajorTicks);
									TickValue = TickValue.toPrecision(SigFigs);
									NumberLength = Graph.Context.measureText(TickValue).width;
									
									AxisDependentOffset = __Vec.Add(__Vec.Mul(OppAxisDirection, NumberLength), __Vec.Mul(AxisDirection, 5 /*half number height in pixels*/ ));
								}
								if(!AxisDependentOffset)
								{
									alert("What the shit!");
								}
								var NumberLabelEdge = __Vec.Sub(MajorTickEnd, __Vec.Mul(OppAxisDirection, 10));
								var NonTransformedFillLocation = __Vec.Sub(NumberLabelEdge, AxisDependentOffset)
								var FillLocation = Graph.GraphTransform(NonTransformedFillLocation.X, NonTransformedFillLocation.Y);
								
								Graph.Context.fillStyle = "black";
								Graph.Context.fillText(TickValue, FillLocation.X, FillLocation.Y);
							}
						}
		   			}
			   	};
	return Graph;
}
