inherit ArmorCode;

void extra_create()
{
    set("id",({"suit","shiny suit","newbie armor"}));
    set("short","a suit of shiny metal armor");
    set("long",
      "This suit of armor is made of overlapping, medium-sized plates "
      "of shiny metal.  The plates don't appear to be too thick, "
      "but they will certainly offer at least some protection."
    );
    set("ac",2);
    add("areas","chest");
    add("areas","stomach");
    add("areas","left shoulder");
    add("areas","right shoulder");
    set("weight",250);
    set("value",0);
}
