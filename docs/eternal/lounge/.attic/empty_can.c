inherit ObjectCode;


void extra_create()
{
   set("id","empty can");
   add("id","can");
   set("short","an empty soft drink can");
   set("plural","empty soft drink cans");
   set("long",
      "This is an empty soft drink can.  You could probably get a few " +
      "coins if you sold it to a store to be recycled.");
   set("weight", 10);
   set("gettable", 1);
   set("droppable", 1);
   set("value", 10);
}
