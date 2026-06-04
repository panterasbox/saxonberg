inherit RoomPlusCode;



void extra_create()
{
   set("short","A Color Lab");
   set("day_long",
   "This is the color lab.  It is for students with color monitors, " +
   "who wish to see the screen in color.  If you dont have a color " +
   "monitor, you can junk the binford or highlighter, and move on to " +
   "another lesson.  Those students who have color, might notice a piece of " +
  "paper lying on the table.  Look at the paper to find out more on color." +
   "If you have a gentool but no color, just look at it to find out " +
   "how to use it. "
   );
   set("day_light",10);
   set("night_light",1);
   add("exits", (["west": "room03"]));
   add("descs",([({"paper","piece of paper"}) : "This paper has the basic " +
   "instructions for use of the highlighter or binford.  Only one of " +
   "these objects is needed, and it is all based on personal preference.  " +
   "To use the gentool, you use the same command as the binford.  " +
   "The difference is that it has extra commands that you dont need " +
   "color for.  " +
   "To use the highlighter, type 'lighton' and to set it, look at it " +
   "for more information.  To use the binford, type '=fetch' and look at " +
   "it to set it.  The binford also has the ability to show your coins, " +
   "By typing 'coins', it gives you the amount you are carrying and " +
   "the amount you have in the bank.  When you have completed this lesson, " +
   "you may move on to the next lesson."]) );
}


