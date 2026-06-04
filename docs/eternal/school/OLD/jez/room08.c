inherit RoomPlusCode;


void extra_create()
{
   set("short","A School Library");
   set("day_long",
   "This is a small library in the EotL School.  The shelves " +
   "are lined with many books with all kinds of facts.  " +
   "There is a long table with an open book in front of you.  Why " +
   "don't you see what it has to say."
   );
   set("day_light",10);
   set("night_light",1);
   add("exits", (["south": "room07"]));
   add("exits", (["lounge": "/zone/null/eternal/lounge/lounge"]));
   add("descs",(["book": "This is the final chapter of a text book " +
   "titled 'How to Use Commands'.  It has been well read, by many " +
   "students before you.  This chapter tells of many great legends from " +
   "the history of EotL.  It promises a great opportunity for fun and fulfillment, and " +
   "many days of enjoyment from playing EotL." +
   "  The last part of the textbook gives directions to three newbie areas, so that " +
   "you may find your way as soon as you graduate.  Newbieland from " +
   "lounge is d w s read novel 4n, Orc Village is d e swim 2n w " +
   "n 6w, and Krynn is d e swim 2n w 8n u cave use orb.  Enjoy your " +
   "stay at EotL and Congratulations on graduating from School!"]) );
}


